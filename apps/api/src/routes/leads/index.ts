import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { authorize } from "../../middleware/authorize";
import { canViewLead } from "@lms/auth";
import { canEmployeeSeeConfirmedLead } from "@lms/core";
import { LeadStatus, Role } from "@lms/types";
import { leadListRoute } from "./list";
import { createLeadRoute } from "./create";
import { leadDetailRoute } from "./detail";
import { updateLeadRoute } from "./update";
import { transitionLeadRoute } from "./transition";
import { assignLeadRoute } from "./assign";
import { unassignedLeadsRoute } from "./unassigned";
import { overdueLeadsRoute } from "./overdue";
import { leadFollowUpsRoute } from "./followups";
import { bulkLeadRoutes } from "./bulk";
import { generateAdmissionPDF } from "../../services/admissionPDF";
import {
  invalidateAnalyticsCache,
  invalidateActivityCache,
} from "../../services/cache";
import { QUEUES } from "../../plugins/bullmq";

export async function leadRoutes(fastify: FastifyInstance): Promise<void> {
  // Order matters — specific routes before parameterized routes
  await fastify.register(unassignedLeadsRoute);
  await fastify.register(overdueLeadsRoute);
  await fastify.register(leadFollowUpsRoute);
  await fastify.register(bulkLeadRoutes);
  await fastify.register(leadListRoute);
  await fastify.register(createLeadRoute);

  // GET /leads/:id/confirmed/pdf
  fastify.get(
    "/:id/confirmed/pdf",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.user;

      const lead = await fastify.prisma.lead.findUnique({
        where: { id },
        select: {
          id: true,
          studentName: true,
          phone: true,
          email: true,
          fatherName: true,
          dateOfBirth: true,
          city: true,
          district: true,
          state: true,
          confirmedAt: true,
          status: true,
          confirmedApplication: {
            include: {
              academicRecords: true,
              entranceExams: true,
              documents: { include: { documentType: true } },
            },
          },
          courses: {
            where: { isPrimary: true },
            include: { course: true },
          },
          assignedTo: { select: { name: true } },
          branch: { select: { name: true, city: true, address: true } },
          assignedToId: true,
          createdById: true,
          branchId: true,
        },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Lead not found" },
        });
      }

      const canView = canViewLead(
        { id: userId, role: role as Role, branchId: request.user.branchId },
        {
          id: lead.id,
          assignedToId: lead.assignedToId ?? null,
          createdById: lead.createdById,
          branchId: lead.branchId,
          status: lead.status,
        },
      );

      if (!canView) {
        return reply.status(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You do not have access to this lead",
          },
        });
      }

      if (role === "EMPLOYEE" && lead.status === LeadStatus.CONFIRMED) {
        const visible = canEmployeeSeeConfirmedLead({
          lead: {
            id: lead.id,
            status: lead.status as LeadStatus,
            assignedToId: lead.assignedToId ?? null,
            createdById: lead.createdById,
            confirmedAt: lead.confirmedAt,
            confirmedById: null,
          },
          user: { id: userId, role: role as Role },
        });

        if (!visible) {
          return reply.status(403).send({
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "This confirmed lead has been handed over to admin",
            },
          });
        }
      }

      if (!lead.confirmedApplication) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Confirmed application not found",
          },
        });
      }

      const fileName = `FE-${lead.studentName.replace(/\s+/g, "-")}-Admission.pdf`;

      let pdfBuffer: Buffer;
      try {
        pdfBuffer = await generateAdmissionPDF(lead);
      } catch (err) {
        fastify.log.error(err, "PDF generation failed");
        return reply.status(500).send({
          success: false,
          error: { code: "PDF_ERROR", message: "Failed to generate PDF" },
        });
      }

      return reply
        .type("application/pdf")
        .header("Content-Disposition", `attachment; filename="${fileName}"`)
        .header("Content-Length", pdfBuffer.length)
        .send(pdfBuffer);
    },
  );

  // GET /leads/:id/confirmed
  fastify.get(
    "/:id/confirmed",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const app = await fastify.prisma.confirmedApplication.findUnique({
        where: { leadId: id },
        include: {
          academicRecords: true,
          entranceExams: true,
          documents: { include: { documentType: true } },
        },
      });

      if (!app) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "No confirmed application found",
          },
        });
      }

      return reply.status(200).send({ success: true, data: app });
    },
  );

  // POST /leads/:id/confirmed/academic — bulk replace academic records
  fastify.post(
    "/:id/confirmed/academic",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id: leadId } = request.params as { id: string };
      const { records } = request.body as {
        records: Array<{
          level: string;
          stream?: string;
          institution?: string;
          board?: string;
          passingYear?: number;
          percentage?: number;
          grade?: string;
        }>;
      };

      const app = await fastify.prisma.confirmedApplication.findUnique({
        where: { leadId },
        select: { id: true },
      });

      if (!app) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Confirmed application not found" },
        });
      }

      await fastify.prisma.$transaction([
        fastify.prisma.academicRecord.deleteMany({
          where: { confirmedApplicationId: app.id },
        }),
        ...(records.length > 0
          ? [
              fastify.prisma.academicRecord.createMany({
                data: records.map((r) => ({
                  confirmedApplicationId: app.id,
                  level: r.level as any,
                  stream: r.stream ?? null,
                  institution: r.institution ?? null,
                  board: r.board ?? null,
                  passingYear: r.passingYear ?? null,
                  percentage: r.percentage ?? null,
                  grade: r.grade ?? null,
                })),
              }),
            ]
          : []),
      ]);

      return reply.status(200).send({ success: true });
    },
  );

  // POST /leads/:id/confirmed/exams — bulk replace entrance exams
  fastify.post(
    "/:id/confirmed/exams",
    { preHandler: authenticate },
    async (request, reply) => {
      const { id: leadId } = request.params as { id: string };
      const { exams } = request.body as {
        exams: Array<{
          examName: string;
          rollNo?: string;
          score?: string;
          rank?: number;
        }>;
      };

      const app = await fastify.prisma.confirmedApplication.findUnique({
        where: { leadId },
        select: { id: true },
      });

      if (!app) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Confirmed application not found" },
        });
      }

      await fastify.prisma.$transaction([
        fastify.prisma.entranceExamDetail.deleteMany({
          where: { confirmedApplicationId: app.id },
        }),
        ...(exams.length > 0
          ? [
              fastify.prisma.entranceExamDetail.createMany({
                data: exams.map((e) => ({
                  confirmedApplicationId: app.id,
                  examName: e.examName,
                  rollNo: e.rollNo ?? null,
                  score: e.score ?? null,
                  rank: e.rank ?? null,
                })),
              }),
            ]
          : []),
      ]);

      return reply.status(200).send({ success: true });
    },
  );

  // POST /leads/:id/confirmed/documents
  fastify.post(
    "/:id/confirmed/documents",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id: leadId } = request.params as { id: string };
      const { documentTypeId, fileUrl, fileName, confirmedApplicationId } =
        request.body as {
          documentTypeId: string;
          fileUrl: string;
          fileName: string;
          confirmedApplicationId: string;
        };

      const lead = await fastify.prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          confirmedApplication: { select: { id: true } },
        },
      });

      if (!lead?.confirmedApplication) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Confirmed application not found",
          },
        });
      }

      const doc = await fastify.prisma.leadDocument.create({
        data: {
          confirmedApplicationId:
            confirmedApplicationId || lead.confirmedApplication.id,
          documentTypeId,
          fileUrl,
          fileName,
        },
        include: { documentType: true },
      });

      return reply.status(201).send({ success: true, data: doc });
    },
  );

  // POST /leads/import
  fastify.post(
    "/import",
    {
      preHandler: [authenticate, authorize([Role.ADMIN, Role.SUB_ADMIN])],
    },
    async (request, reply) => {
      const { rows } = request.body as {
        rows: Array<{
          rowIndex: number;
          studentName: string;
          phone: string;
          email?: string | null;
          fatherName?: string | null;
          city?: string | null;
          state?: string | null;
        }>;
      };

      const { id: userId, branchId } = request.user;

      // Get existing leads for duplicate check
      const existingLeads = await fastify.prisma.lead.findMany({
        where: {
          OR: [
            { phone: { in: rows.map((r) => r.phone).filter(Boolean) } },
            {
              email: {
                in: rows.map((r) => r.email).filter(Boolean) as string[],
              },
            },
          ],
        },
        select: {
          id: true,
          phone: true,
          email: true,
          status: true,
          isDuplicate: true,
          duplicateOfId: true,
        },
      });

      const { processImportRows } = await import("@lms/core");
      const result = processImportRows(rows as any, existingLeads as any);

      // Create clean leads
      const created = [];
      for (const row of result.imported) {
        try {
          const lead = await fastify.prisma.lead.create({
            data: {
              studentName: row.studentName,
              phone: row.phone,
              email: (row as any).email ?? null,
              fatherName: (row as any).fatherName ?? null,
              city: (row as any).city ?? null,
              state: (row as any).state ?? null,
              branchId,
              createdById: userId,
              assignedToId: userId,
              status: "NEW",
            },
          });
          created.push(lead);
        } catch {
          /* skip individual failures */
        }
      }

      return reply.status(200).send({
        success: true,
        data: {
          imported: created,
          duplicateQueue: result.duplicateQueue,
          errors: result.errors,
        },
      });
    },
  );

  // PATCH /leads/:id/confirmed
  fastify.patch(
    "/:id/confirmed",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id: leadId } = request.params as { id: string };
      const raw = request.body as Record<string, unknown>;

      const DATE_FIELDS = ["bookingDate", "admissionDate", "dueDate"] as const;
      const body: Record<string, unknown> = { ...raw };
      for (const field of DATE_FIELDS) {
        if (typeof body[field] === "string" && body[field]) {
          body[field] = new Date(body[field] as string);
        } else if (body[field] === "" || body[field] === null) {
          body[field] = null;
        }
      }

      const existing = await fastify.prisma.confirmedApplication.findUnique({
        where: { leadId },
        select: { aadharNo: true, fatherOccupation: true, motherName: true },
      });

      const isFormComplete = Boolean(
        (body["aadharNo"] || existing?.aadharNo) &&
          (body["fatherOccupation"] ||
            existing?.fatherOccupation ||
            existing?.motherName ||
            body["motherName"]),
      );

      const updated = await fastify.prisma.confirmedApplication.upsert({
        where: { leadId },
        create: {
          leadId,
          ...(body as any),
          isFormComplete,
        },
        update: {
          ...(body as any),
          isFormComplete,
        },
        include: {
          academicRecords: true,
          entranceExams: true,
          documents: { include: { documentType: true } },
        },
      });

      return reply.status(200).send({ success: true, data: updated });
    },
  );

  // POST /leads/:id/send-admission
  fastify.post(
    "/:id/send-admission",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { id: userId } = request.user;

      const lead = await fastify.prisma.lead.findUnique({
        where: { id },
        select: {
          id: true,
          studentName: true,
          phone: true,
          email: true,
          fatherName: true,
          dateOfBirth: true,
          city: true,
          district: true,
          state: true,
          qualification: true,
          schoolCollege: true,
          boardUniversity: true,
          passingYear: true,
          percentage: true,
          status: true,
          courses: { where: { isPrimary: true }, include: { course: true } },
          assignedTo: { select: { name: true } },
          branch: { select: { name: true, city: true, address: true } },
          confirmedApplication: {
            include: {
              academicRecords: true,
              entranceExams: true,
              documents: { include: { documentType: true } },
            },
          },
        },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Lead not found" },
        });
      }

      if (!lead.confirmedApplication) {
        return reply.status(400).send({
          success: false,
          error: { code: "FORM_INCOMPLETE", message: "Admission form not started yet" },
        });
      }

      const pdfBuffer = await generateAdmissionPDF(lead);

      let emailSent = false;
      if (lead.email) {
        try {
          await fastify.queues[QUEUES.NOTIFICATIONS].add(
            "admission-form-email",
            {
              to: lead.email,
              studentName: lead.studentName,
              branchName: lead.branch.name,
              courseName: lead.courses[0]?.course.name ?? "",
              pdfBuffer: pdfBuffer.toString("base64"),
            },
            { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
          );
          emailSent = true;
        } catch {
          emailSent = false;
        }
      }

      await fastify.prisma.$transaction(async (tx) => {
        await tx.confirmedApplication.update({
          where: { leadId: id },
          data: {
            sentToStudentAt: new Date(),
            sentToStudentEmail: lead.email,
            isFormComplete: true,
          },
        });

        await tx.lead.update({
          where: { id },
          data: {
            status: LeadStatus.CONFIRMED,
            confirmedAt: new Date(),
            confirmedById: userId,
          },
        });

        await tx.interactionLog.create({
          data: {
            leadId: id,
            userId,
            type: "STATUS_CHANGED",
            note: `Admission application form completed and sent${emailSent ? ` to ${lead.email}` : ""}`,
            statusBefore: lead.status,
            statusAfter: LeadStatus.CONFIRMED,
          },
        });

        await tx.auditLog.create({
          data: {
            leadId: id,
            userId,
            action: "ADMISSION_FORM_SENT",
            newValue: { emailSent, sentTo: lead.email },
          },
        });
      });

      await invalidateAnalyticsCache(fastify.redis);
      await invalidateActivityCache(
        fastify.redis,
        request.user.branchId,
        request.user.id,
      );

      return reply.status(200).send({
        success: true,
        data: { emailSent, sentTo: lead.email ?? null },
      });
    },
  );

  await fastify.register(leadDetailRoute);
  await fastify.register(updateLeadRoute);
  await fastify.register(transitionLeadRoute);
  await fastify.register(assignLeadRoute);
}
