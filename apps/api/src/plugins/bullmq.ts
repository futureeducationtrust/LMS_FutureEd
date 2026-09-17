import fp from "fastify-plugin";
import { Queue } from "bullmq";
import type Redis from "ioredis";
import type { FastifyInstance } from "fastify";

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

// Retention. Redis here is a 30 MB managed instance shared with auth
// blacklists and analytics cache; every completed job is ~1 KB, so without
// these the queue alone filled it (25k jobs → OOM → every write, including
// the auth throttle, failed). Keep a day of completed jobs for debugging,
// a week of failures, and hard caps so a burst can't blow the budget.
export const JOB_RETENTION = {
  removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
  removeOnFail: { age: 7 * 24 * 60 * 60, count: 500 },
} as const;

// BullMQ's per-queue event stream is also unbounded by default (10k entries).
const EVENT_STREAM_MAX_LEN = 1000;

export const bullmqPlugin = fp(async (fastify) => {
  const connection = fastify.redis as Redis;
  const opts = {
    connection,
    defaultJobOptions: JOB_RETENTION,
    streams: { events: { maxLen: EVENT_STREAM_MAX_LEN } },
  };

  const queues: Record<QueueName, Queue> = {
    [QUEUES.NOTIFICATIONS]: new Queue(QUEUES.NOTIFICATIONS, opts),
    [QUEUES.PDF]: new Queue(QUEUES.PDF, opts),
    [QUEUES.IMPORT]: new Queue(QUEUES.IMPORT, opts),
  };

  fastify.decorate("queues", queues);

  fastify.addHook("onClose", async () => {
    await Promise.all(Object.values(queues).map((q) => q.close()));
  });
});

// removeOnComplete/removeOnFail only prune when a NEW job completes, so jobs
// left over from before retention existed (or from a period when Redis was
// rejecting writes) are never touched. This sweep applies the same age
// limits to whatever is already there. Called on boot and every 6 hours.
export async function sweepStaleJobs(fastify: FastifyInstance): Promise<void> {
  for (const [name, queue] of Object.entries(fastify.queues)) {
    try {
      let completed = 0;
      let failed = 0;
      for (let i = 0; i < 50; i++) {
        const ids = await queue.clean(JOB_RETENTION.removeOnComplete.age * 1000, 1000, "completed");
        completed += ids.length;
        if (ids.length < 1000) break;
      }
      for (let i = 0; i < 20; i++) {
        const ids = await queue.clean(JOB_RETENTION.removeOnFail.age * 1000, 1000, "failed");
        failed += ids.length;
        if (ids.length < 1000) break;
      }
      // Trim the event stream too — clean() doesn't touch it.
      await queue.trimEvents(EVENT_STREAM_MAX_LEN);
      if (completed || failed) {
        fastify.log.info({ queue: name, completed, failed }, "Swept stale BullMQ jobs");
      }
    } catch (err) {
      fastify.log.warn({ err, queue: name }, "BullMQ sweep failed (non-fatal)");
    }
  }
}
