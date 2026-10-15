import type { FastifyInstance, FastifyRequest } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { LeadListQuerySchema, Role as RoleEnum } from "@lms/types";
import type { LeadListQuery } from "@lms/types";
import { validateQuery } from "../../middleware/validate";
import { buildLeadWhereClause, leadSummarySelect } from "./service";
import { getInteractedLeadIds } from "../analytics/service";
import type { LeadStatus, Role } from "@lms/types";

const ALLOWED_PAGE_SIZES = [20, 50, 80];
const DEFAULT_PAGE_SIZE = 20;
const EXPORT_MAX_ROWS = 20_000;

const leadExportSelect = {
  ...leadSummarySelect,
  alternatePhone: true,
  whatsappNumber: true,
  state: true,
  gender: true,
  qualification: true,
  remarks: true,
  confirmedApplication: {
    select: {
      admissionId: true,
      fileNumber: true,
      isFormComplete: true,
      sentToStudentAt: true,
      category: true,
      bookingAmount: true,
      bookingDate: true,
      admissionAmount: true,
      admissionDate: true,
      duesAmount: true,
      dueDate: true,
    },
  },
} as const;

const SORT_FIELDS: Record<string, string> = {
  createdAt: "createdAt",
  studentName: "studentName",
  status: "status",
  nextFollowUpAt: "nextFollowUpAt",
};

// Filters shared by the list and the Excel export, so an export always
// contains exactly what the list shows (minus paging).
async function buildListWhere(
  fastify: FastifyInstance,
  request: FastifyRequest,
  query: LeadListQuery,
) {
  const rawQuery = request.query as Record<string, string | undefined>;
  // showAllStatuses bypasses the default CONFIRMED/INTERESTED exclusion (used by dashboard drill-through)
  const showAllStatuses = rawQuery.showAllStatuses === "true";
  const { id: userId, role, branchId: userBranchId } = request.user;

  const assignedToId = role === "EMPLOYEE" ? undefined : query.assignedToId;
  // SUB_ADMIN is always scoped to their own branch — matches the analytics module's
  // effectiveBranchId behavior so leaderboard drill-throughs reconcile with the report totals.
  const effectiveBranchId = role === "SUB_ADMIN" ? userBranchId : query.branchId;
  const filters: Parameters<typeof buildLeadWhereClause>[0]["filters"] = {};

  if (query.statuses) {
    const parsed = query.statuses.split(",").map(s => s.trim()).filter(Boolean) as LeadStatus[];
    if (parsed.length > 0) filters.statuses = parsed;
  }
  if (query.status) filters.status = query.status as LeadStatus;
  if (query.interactionType) filters.interactionType = query.interactionType;
  if (query.interactedByUserId) filters.interactedByUserId = query.interactedByUserId;
  if (assignedToId) filters.assignedToId = assignedToId;
  if (query.courseId) filters.courseId = query.courseId;
  if (query.sourceId) filters.sourceId = query.sourceId;
  if (query.campaignId) filters.campaignId = query.campaignId;
  if (query.searchField) filters.searchField = query.searchField;
  if (query.assignedToIds && role !== "EMPLOYEE") {
    const ids = query.assignedToIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) filters.assignedToIds = ids;
  }
  if (query.search) filters.search = query.search;
  if (query.dateFrom) filters.dateFrom = query.dateFrom;
  if (query.dateTo) filters.dateTo = query.dateTo;
  if (query.admissionYear) filters.admissionYear = query.admissionYear;
  if (role !== "EMPLOYEE" && effectiveBranchId)
    filters.branchId = effectiveBranchId;
  if (query.overdue) filters.overdue = true;
  if (rawQuery.upcoming === "true") filters.upcoming = true;
  if (showAllStatuses) filters.showAllStatuses = true;
  if (rawQuery.excludeTerminal === "true") filters.excludeTerminal = true;
  if (rawQuery.excludeUnassigned === "true") filters.excludeUnassigned = true;
  if (rawQuery.dateBy === "confirmedAt") filters.dateBy = "confirmedAt";

  // "Leads Interacted" total card drill-through (Employee Performance
  // panel) — leads whose CURRENT owner logged an interaction on them in
  // the period. Not expressible as a normal filter (it compares each
  // lead's assignedToId against InteractionLog rows dynamically), so the
  // matching IDs are precomputed with the exact same rule the card's
  // total is built from (getInteractedLeadIds / computeInteractedPairs).
  if (rawQuery.interactedByOwner === "true") {
    filters.leadIds = await getInteractedLeadIds({
      prisma: fastify.prisma,
      period: query.dateFrom && query.dateTo ? "custom" : "last30",
      ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
      ...(query.dateTo ? { dateTo: query.dateTo } : {}),
      ...(role !== "EMPLOYEE" && effectiveBranchId ? { branchId: effectiveBranchId } : {}),
    });
  }

  return buildLeadWhereClause({
    userId,
    userRole: role as Role,
    filters,
  });
}

export async function leadListRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const qValidation = validateQuery(LeadListQuerySchema, request.query);
      if (!qValidation.success) {
        return reply.status(400).send({ success: false, ...qValidation.error });
      }

      const query = qValidation.data;
      const page = Math.max(1, query.page);
      const pageSize = ALLOWED_PAGE_SIZES.includes(query.pageSize)
        ? query.pageSize
        : DEFAULT_PAGE_SIZE;

      const sortBy = SORT_FIELDS[query.sortBy ?? "createdAt"] ?? "createdAt";
      const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";

      const where = await buildListWhere(fastify, request, query);

      const [leads, total] = await Promise.all([
        fastify.prisma.lead.findMany({
          where,
          select: leadSummarySelect,
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        fastify.prisma.lead.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: {
          leads,
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      });
    },
  );

  // ── GET /leads/export — every lead matching the list filters, for Excel ──
  // Same filters as GET /leads, no paging. The browser builds the .xlsx.
  // Managers only: an export is the whole dataset leaving the system.
  fastify.get(
    "/export",
    { preHandler: [authenticate, authorize([RoleEnum.ADMIN, RoleEnum.SUB_ADMIN])] },
    async (request, reply) => {
      const qValidation = validateQuery(LeadListQuerySchema, request.query);
      if (!qValidation.success) {
        return reply.status(400).send({ success: false, ...qValidation.error });
      }
      const query = qValidation.data;
      const sortBy = SORT_FIELDS[query.sortBy ?? "createdAt"] ?? "createdAt";
      const sortOrder = query.sortOrder === "asc" ? "asc" : "desc";
      const where = await buildListWhere(fastify, request, query);

      const [leads, total] = await Promise.all([
        fastify.prisma.lead.findMany({
          where,
          select: leadExportSelect,
          orderBy: { [sortBy]: sortOrder },
          take: EXPORT_MAX_ROWS,
        }),
        fastify.prisma.lead.count({ where }),
      ]);

      return reply.status(200).send({
        success: true,
        data: { leads, total, truncated: total > leads.length },
      });
    },
  );
}
