/**
 * Cleans up the LLM token-usage journal (#401): deletes RAW `usage_records` rows
 * older than `USAGE_RETENTION_DAYS`. The daily aggregates (`usage_daily`) are NOT
 * touched — the report stays complete over the full history. Meant to run ONCE A
 * DAY on a schedule (cron). Run:
 *   PERSISTENCE_MODE=postgres DATABASE_URL=... npm run usage:prune
 * In memory mode, cleanup isn't needed (the in-memory journal is already bounded by
 * its ring buffer and aggregate window) — the script reports that and exits without
 * an error.
 */
import { loadEnv } from "../src/infrastructure/config/env.js";
import { ConsoleLogger } from "../src/infrastructure/logging/logger.js";
import { PrismaUsageRepository } from "../src/infrastructure/persistence/prisma-usage-repository.js";

/** The cutoff day (YYYY-MM-DD): rows older than this are deleted. */
function cutoffDay(retentionDays: number, today: Date): string {
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - retentionDays);
  return d.toISOString().slice(0, 10);
}

async function main(): Promise<void> {
  const env = loadEnv();
  const logger = new ConsoleLogger();
  if (env.PERSISTENCE_MODE !== "postgres") {
    logger.info("usage.prune.skipped", { reason: "memory mode: journal is self-limiting" });
    return;
  }
  const cutoff = cutoffDay(env.USAGE_RETENTION_DAYS, new Date());
  const removed = await new PrismaUsageRepository().pruneOlderThan(cutoff);
  logger.info("usage.prune.done", {
    cutoffDay: cutoff,
    retentionDays: env.USAGE_RETENTION_DAYS,
    removed,
  });
}

main().catch((error: unknown) => {
  console.error("usage.prune.failed", error);
  process.exit(1);
});
