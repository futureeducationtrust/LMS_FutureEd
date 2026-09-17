import { buildServer } from "./server";
import { config } from "./config";
import { startFollowUpCron } from "./jobs/followUp";
import { startDailyReportCron } from "./jobs/dailyReport";
import { startNotificationWorker } from "./workers/notifications";
import { sweepStaleJobs } from "./plugins/bullmq";
import { verifyEmailConnection } from "./services/email";
import { subscribePageToApp } from "./services/metaLeadForm";

async function main() {
  const fastify = await buildServer();
  let notificationWorker: ReturnType<typeof startNotificationWorker> | null =
    null;
  let sweepTimer: NodeJS.Timeout | null = null;

  // Start background jobs after server is ready
  fastify.addHook("onReady", async () => {
    // Prune stale queue records first so Redis has headroom before anything enqueues.
    void sweepStaleJobs(fastify);
    sweepTimer = setInterval(() => void sweepStaleJobs(fastify), 6 * 60 * 60 * 1000);

    startFollowUpCron(fastify);
    startDailyReportCron(fastify);
    notificationWorker = startNotificationWorker(fastify.redis as any);
    // Fire-and-forget — SMTP verify is diagnostic only and must not block startup
    void verifyEmailConnection();
    void subscribePageToApp();
  });

  fastify.addHook("onClose", async () => {
    if (sweepTimer) clearInterval(sweepTimer);
    if (notificationWorker) {
      await notificationWorker.close();
    }
  });

  try {
    await fastify.listen({
      port: config.port,
      host: "0.0.0.0", // required for DigitalOcean
    });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

void main();
