/**
 * Force-logout every user in the system.
 *
 *   pnpm tsx scripts/force-logout-all.ts              # dry run — reports, changes nothing
 *   pnpm tsx scripts/force-logout-all.ts --confirm    # revoke access tokens (reversible)
 *   pnpm tsx scripts/force-logout-all.ts --confirm --purge-refresh-tokens
 *
 * Two independent layers, matching how the API validates a session:
 *
 *   1. Access tokens (JWT, 15 min) are stateless, so they are killed the way the
 *      app already does it: a `user-logout:<userId>` key in Redis, which
 *      middleware/authenticate.ts checks on every request. Reversible — delete
 *      the keys (or let the TTL lapse) and those tokens work again, if unexpired.
 *
 *   2. Refresh tokens are rows in the RefreshToken table. --purge-refresh-tokens
 *      deletes them. This is PERMANENT: the raw tokens are only stored hashed,
 *      so nothing can restore a deleted session.
 *
 * Note that refreshAccessToken() clears `user-logout:<userId>` on a successful
 * refresh. Layer 1 alone therefore holds only while refresh is unavailable — the
 * web proxy blocks it via PAYMENT_DUE_BLOCK, but the API is still directly
 * reachable. Use --purge-refresh-tokens when the sign-out must be absolute.
 */
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@lms/db";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import Redis from "ioredis";

for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "src/.env"),
]) {
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
}

const CONFIRM = process.argv.includes("--confirm");
const PURGE_REFRESH = process.argv.includes("--purge-refresh-tokens");
// Long enough to outlive any unexpired 15-minute access token many times over.
const LOGOUT_TTL_SECONDS = 7 * 24 * 60 * 60;

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function redactUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.hostname}:${u.port}${u.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

async function main(): Promise<void> {
  const databaseUrl = requireEnv("DATABASE_URL");
  const redisUrl = requireEnv("REDIS_URL");

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 5 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
  await redis.connect();

  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true },
    });
    const refreshTokens = await prisma.refreshToken.count();

    const byRole = users.reduce<Record<string, number>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {});

    console.log(`\n  Database : ${redactUrl(databaseUrl)}`);
    console.log(`  Redis    : ${redactUrl(redisUrl)}`);
    console.log(
      `\n  Users            : ${users.length}  (${Object.entries(byRole)
        .map(([r, n]) => `${r} ${n}`)
        .join(", ")})`,
    );
    console.log(
      `  Active sessions  : ${refreshTokens} refresh token${refreshTokens === 1 ? "" : "s"}`,
    );

    if (!CONFIRM) {
      console.log(`\n  DRY RUN — nothing changed.`);
      console.log(
        `  Would set user-logout:<id> for ${users.length} users (TTL ${LOGOUT_TTL_SECONDS}s)`,
      );
      console.log(
        `  Would delete refresh tokens: ${PURGE_REFRESH ? `yes (${refreshTokens} rows)` : "no (pass --purge-refresh-tokens)"}`,
      );
      console.log(`\n  Re-run with --confirm to apply.\n`);
      return;
    }

    const stamp = Date.now().toString();
    const pipeline = redis.pipeline();
    for (const user of users) {
      pipeline.setex(`user-logout:${user.id}`, LOGOUT_TTL_SECONDS, stamp);
    }
    const results = await pipeline.exec();
    const failed = (results ?? []).filter(([err]) => err).length;
    const revoked = users.length - failed;
    console.log(
      `\n  ✓ Revoked access tokens for ${revoked} user${revoked === 1 ? "" : "s"}`,
    );
    if (failed > 0) {
      console.log(`  ! ${failed} Redis write${failed === 1 ? "" : "s"} failed`);
    }

    if (PURGE_REFRESH) {
      const { count } = await prisma.refreshToken.deleteMany({});
      console.log(
        `  ✓ Deleted ${count} refresh token${count === 1 ? "" : "s"}`,
      );
    } else {
      console.log(`  · Refresh tokens left intact (${refreshTokens} rows)`);
    }

    console.log(`\n  Everyone is signed out.\n`);
  } finally {
    await prisma.$disconnect();
    await pool.end();
    redis.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(
    "\n  Failed:",
    error instanceof Error ? error.message : error,
    "\n",
  );
  process.exit(1);
});
