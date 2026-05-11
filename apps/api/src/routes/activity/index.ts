import type { FastifyInstance } from "fastify";
import { authenticate } from "../../middleware/authenticate";
import { Role } from "@lms/types";

export async function activityRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get(
    "/",
    {
      preHandler: authenticate,
    },
    async (request, reply) => {
      const { id: userId, role } = request.user;

      const where: Record<string, unknown> = {
        isDeleted: false,
      };

      // Employees only see activity on their leads
      if (role === Role.EMPLOYEE) {
        where["lead"] = {
          OR: [{ assignedToId: userId }, { createdById: userId }],
        };
      }

      const interactions = await fastify.prisma.interactionLog.findMany({
        where,
        select: {
          id: true,
          type: true,
          note: true,
          statusBefore: true,
          statusAfter: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
          lead: {
            select: {
              id: true,
              studentName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return reply.status(200).send({ success: true, data: { interactions } });
    },
  );
}
