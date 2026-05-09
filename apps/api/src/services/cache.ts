import type Redis from "ioredis";

// Call this whenever a lead status changes, is created, or assigned
// Prevents stale analytics on the dashboard
export async function invalidateAnalyticsCache(redis: Redis): Promise<void> {
  try {
    const keys = await redis.keys("analytics:*");
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // Non-critical — cache will expire naturally
  }
}
