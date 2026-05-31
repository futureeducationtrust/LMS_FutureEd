import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { canTransitionLead } from "@lms/auth";
import { transitionLead, getValidTransitions } from "@lms/core";
import { LeadStatus, Role, TransitionLeadSchema } from "@lms/types";
import { validateBody } from "../../middleware/validate";
import { QUEUES } from "../../plugins/bullmq";
import {
  invalidateAnalyticsCache,
  invalidateActivityCache,
} from "../../services/cache";

export async function transitionLeadRoute(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post(
    "/:id/transition",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.user;
      const validation = validateBody(TransitionLeadSchema, request.body);
      if (!validation.success) {
        return reply.status(400).send({ success: false, ...validation.error });
      }
      const { toStatus, note } = validation.data;

      const lead = await fastify.prisma.lead.findUnique({
        where: { id },
        select: {
          id: true,
          studentName: true,
          email: true,
          status: true,
          assignedTo: { select: { id: true } },
          createdBy: { select: { id: true } },
          branchId: true,
        },
      });

      if (!lead) {
        return reply.status(404).send({
          success: false,
          error: { code: "NOT_FOUND", message: "Lead not found" },
        });
      }

      // Permission check
      const canTransition = canTransitionLead(
        { id: userId, role: role as Role, branchId: request.user.branchId },
        {
          id: lead.id,
          assignedToId: lead.assignedTo?.id ?? null,
          createdById: lead.createdBy.id,
          branchId: lead.branchId,
          status: lead.status,
        },
      );

      if (!canTransition) {
        return reply.status(403).send({
          success: false,
          error: { code: "FORBIDDEN", message: "You cannot update this lead" },
        });
      }

      // Block APPLICATION_SENT unless the admission form is marked complete
      if (toStatus === LeadStatus.APPLICATION_SENT) {
        const confirmedApp =
          await fastify.prisma.confirmedApplication.findUnique({
            where: { leadId: id },
            select: { isFormComplete: true },
          });

        if (!confirmedApp?.isFormComplete) {
          return reply.status(400).send({
            success: false,
            error: {
              code: "FORM_INCOMPLETE",
              message:
                "Admission application form must be filled and saved before marking as Application Sent",
              details: { redirectTo: "admission-form" },
            },
          });
        }
      }

      // State machine validation
      const result = transitionLead(lead.status as LeadStatus, toStatus);

      if (!result.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            details: {
              validTransitions: getValidTransitions(lead.status as LeadStatus),
            },
          },
        });
      }

      const previousStatus = lead.status as LeadStatus;

      // Handle CONFIRMED transition specially
      const isConfirming = toStatus === LeadStatus.CONFIRMED;

      await fastify.prisma.$transaction(async (tx) => {
        await tx.lead.update({
          where: { id },
          data: {
            status: toStatus,
            ...(isConfirming
              ? { confirmedAt: new Date(), confirmedById: userId }
              : {}),
          },
        });

        await tx.interactionLog.create({
          data: {
            leadId: id,
            userId,
            type: "STATUS_CHANGED",
            note: note ?? null,
            statusBefore: previousStatus,
            statusAfter: toStatus,
          },
        });

        await tx.auditLog.create({
          data: {
            leadId: id,
            userId,
            action: "STATUS_CHANGED",
            oldValue: { status: previousStatus },
            newValue: { status: toStatus },
          },
        });

        // Create ConfirmedApplication record when confirmed, generate IDs
        if (isConfirming) {
          await tx.confirmedApplication.upsert({
            where: { leadId: id },
            update: {},
            create: { leadId: id },
          });

          // Only generate IDs if not already assigned
          const existing = await tx.confirmedApplication.findUnique({
            where: { leadId: id },
            select: { admissionId: true, fileNumber: true },
          });

          if (!existing?.admissionId) {
            const year = new Date().getFullYear();
            const totalCount = await tx.confirmedApplication.count();
            const yearCount = await tx.confirmedApplication.count({
              where: { createdAt: { gte: new Date(`${year}-01-01`) } },
            });
            const admissionId = `S${String(totalCount + 1).padStart(4, "0")}`;
            const fileNumber = `${yearCount + 1}/${year}`;
            await tx.confirmedApplication.update({
              where: { leadId: id },
              data: { admissionId, fileNumber },
            });
          }
        }
      });

      if (
        toStatus === LeadStatus.APPLICATION_SENT &&
        validation.data.sendEmailToStudent &&
        lead.email
      ) {
        await fastify.queues[QUEUES.NOTIFICATIONS].add(
          "application-sent-email",
          {
            to: lead.email,
            studentName: lead.studentName,
            institutionName: validation.data.institutionName ?? "Institution",
            programName: validation.data.programName ?? "Program",
            applicationNumber: validation.data.applicationNumber ?? undefined,
          },
          { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
        );
      }

      await invalidateAnalyticsCache(fastify.redis);
      await invalidateActivityCache(
        fastify.redis,
        request.user.branchId,
        request.user.id,
      );

      return reply.status(200).send({
        success: true,
        data: { previousStatus, newStatus: toStatus },
      });
    },
  );
}
