import type { LlmUsageSink, UsageRecordInput } from "@/application/ports/llm-usage-sink";
import type {
  OwnerUsageBucket,
  UsageDailyBucket,
  UsageReport,
  UsageReportRepository,
} from "@/application/ports/usage-report-repository";
import { costMinorFromTokens, isAiFeature, type AiFeature } from "@/domain/ai/llm-usage";
import { prisma } from "./prisma-client";

/**
 * Postgres journal of token usage (#216, Prisma). On every LLM call, atomically:
 * a raw record (detail/audit) + an increment of the daily aggregate (the report
 * reads aggregates, it doesn't scan raw data). costMinor is computed from tokens
 * on read. Raw-data rotation is handled by `pruneOlderThan` (called rarely/on a
 * schedule, NOT on the write path).
 *
 * Data-protection compliance: only token counts + enum labels are written, no
 * request/response body.
 */
export class PrismaUsageRepository implements LlmUsageSink, UsageReportRepository {
  record(entry: UsageRecordInput): void {
    const day = entry.at.slice(0, 10);
    const at = new Date(entry.at);
    // Fire-and-forget: telemetry never blocks or breaks the main LLM call.
    void prisma
      .$transaction([
        prisma.usageRecord.create({
          data: {
            id: crypto.randomUUID(),
            feature: entry.feature,
            provider: entry.provider,
            model: entry.model,
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
            cachedTokens: entry.cachedTokens,
            estimated: entry.estimated,
            ownerId: entry.ownerId,
            createdAt: at,
          },
        }),
        prisma.usageDaily.upsert({
          where: { day_feature_model: { day, feature: entry.feature, model: entry.model } },
          create: {
            day,
            feature: entry.feature,
            model: entry.model,
            calls: 1,
            inputTokens: entry.inputTokens,
            outputTokens: entry.outputTokens,
            cachedTokens: entry.cachedTokens,
          },
          update: {
            calls: { increment: 1 },
            inputTokens: { increment: entry.inputTokens },
            outputTokens: { increment: entry.outputTokens },
            cachedTokens: { increment: entry.cachedTokens },
          },
        }),
      ])
      .catch(() => {
        // A telemetry failure is not critical — swallow it (like the providers: no body/PII in the log).
      });
  }

  async getReport(range: { fromDay: string; toDay: string }): Promise<UsageReport> {
    const rows = await prisma.usageDaily.findMany({
      where: { day: { gte: range.fromDay, lte: range.toDay } },
      orderBy: [{ day: "asc" }, { feature: "asc" }],
    });
    return rows.map(
      (r): UsageDailyBucket => ({
        day: r.day,
        feature: r.feature,
        model: r.model,
        calls: r.calls,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cachedTokens: r.cachedTokens,
        costMinor: costMinorFromTokens(r.inputTokens, r.outputTokens),
      }),
    );
  }

  async getOwnerReport(range: {
    fromDay: string;
    toDay: string;
  }): Promise<readonly OwnerUsageBucket[]> {
    const from = new Date(`${range.fromDay}T00:00:00.000Z`);
    const toExclusive = new Date(`${range.toDay}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const rows = await prisma.usageRecord.groupBy({
      by: ["ownerId"],
      where: { createdAt: { gte: from, lt: toExclusive } },
      _count: { _all: true },
      _sum: { inputTokens: true, outputTokens: true },
    });
    return rows
      .map((r): OwnerUsageBucket => {
        const inputTokens = r._sum.inputTokens ?? 0;
        const outputTokens = r._sum.outputTokens ?? 0;
        return {
          ownerId: r.ownerId,
          calls: r._count._all,
          inputTokens,
          outputTokens,
          costMinor: costMinorFromTokens(inputTokens, outputTokens),
        };
      })
      .sort((a, b) => b.costMinor - a.costMinor);
  }

  async listRecent(limit: number): Promise<readonly UsageRecordInput[]> {
    const rows = await prisma.usageRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(
      (r): UsageRecordInput => ({
        feature: toFeature(r.feature),
        provider: r.provider,
        model: r.model,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens,
        cachedTokens: r.cachedTokens,
        estimated: r.estimated,
        ownerId: r.ownerId ?? null,
        at: r.createdAt.toISOString(),
      }),
    );
  }

  /** Raw-data rotation: deletes records older than `cutoffDay` (YYYY-MM-DD). Call rarely/on a schedule. */
  async pruneOlderThan(cutoffDay: string): Promise<number> {
    const result = await prisma.usageRecord.deleteMany({
      where: { createdAt: { lt: new Date(`${cutoffDay}T00:00:00.000Z`) } },
    });
    return result.count;
  }
}

/** Persisted feature is a string; narrow it to AiFeature (our own records are always valid; anything else -> a neutral default). */
function toFeature(value: string): AiFeature {
  return isAiFeature(value) ? value : "manager_question";
}
