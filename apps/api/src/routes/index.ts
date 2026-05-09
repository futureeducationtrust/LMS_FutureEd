import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth";
import { leadRoutes } from "./leads";
import { interactionRoutes } from "./interactions";
import { uploadRoutes } from "./upload";
import { userRoutes } from "./users";
import { branchRoutes } from "./branches";
import { analyticsRoutes } from "./analytics";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
  await fastify.register(leadRoutes, { prefix: "/api/v1/leads" });
  await fastify.register(interactionRoutes, { prefix: "/api/v1/leads" });
  await fastify.register(uploadRoutes, { prefix: "/api/v1/upload" });
  await fastify.register(userRoutes, { prefix: "/api/v1/users" });
  await fastify.register(branchRoutes, { prefix: "/api/v1/branches" });
  await fastify.register(analyticsRoutes, { prefix: "/api/v1/analytics" });
}
