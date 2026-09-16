import fp from "fastify-plugin";
import { Queue } from "bullmq";
import type Redis from "ioredis";

// Queue names as constants — never use magic strings
export const QUEUES = {
  NOTIFICATIONS: "notifications",
  PDF: "pdf",
  IMPORT: "import",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

declare module "fastify" {
  interface FastifyInstance {
    queues: Record<QueueName, Queue>;
  }
}

export const bullmqPlugin = fp(async (fastify) => {
  const connection = fastify.redis as Redis;
  const defaultJobOptions = {
    removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
    removeOnFail: { age: 7 * 24 * 60 * 60, count: 1000 },
  };

  const queues: Record<QueueName, Queue> = {
    [QUEUES.NOTIFICATIONS]: new Queue(QUEUES.NOTIFICATIONS, {
      connection,
      defaultJobOptions,
    }),
    [QUEUES.PDF]: new Queue(QUEUES.PDF, { connection, defaultJobOptions }),
    [QUEUES.IMPORT]: new Queue(QUEUES.IMPORT, {
      connection,
      defaultJobOptions,
    }),
  };

  fastify.decorate("queues", queues);

  fastify.addHook("onClose", async () => {
    await Promise.all(Object.values(queues).map((q) => q.close()));
  });
});
