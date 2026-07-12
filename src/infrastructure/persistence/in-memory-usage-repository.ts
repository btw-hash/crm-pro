import type { LlmUsageSink, UsageRecordInput } from "@/application/ports/llm-usage-sink";
import type {
  OwnerUsageBucket,
  UsageDailyBucket,
  UsageReport,
  UsageReportRepository,
} from "@/application/ports/usage-report-repository";
import { costMinorFromTokens } from "@/domain/ai/llm-usage";

const DEFAULT_MAX_RECENT = 1000;
const DEFAULT_MAX_DAYS = 90;

interface DailyBucket {
  readonly day: string;
  readonly feature: string;
  readonly model: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
}

export interface InMemoryUsageRepositoryOptions {
  /** Capacity of the detail ring buffer (last N records). */
  readonly maxRecent?: number;
  /** Aggregate window in days (buckets older than this are dropped). */
  readonly maxDays?: number;
}

/**
 * In-memory journal of LLM token usage (#216) for PERSISTENCE_MODE=memory (demo).
 *
 * MEMORY GUARANTEE (anti-OOM on a small demo VM) — by construction, not by luck:
 * - Detail (`listRecent`) is a RING buffer of FIXED capacity `maxRecent`:
 *   a new record overwrites the oldest slot (O(1), no push/shift, no growth).
 * - Aggregates (`getReport`) are a Map keyed by (day|feature|model) with a
 *   `maxDays` window: on every write, buckets older than the window are
 *   removed; cardinality is bounded by days x features x models.
 * Both structures have a hard upper bound independent of the number of LLM calls.
 */
export class InMemoryUsageRepository implements LlmUsageSink, UsageReportRepository {
  private readonly maxRecent: number;
  private readonly maxDays: number;
  private readonly recent: (UsageRecordInput | undefined)[];
  private writeIndex = 0;
  private recordedCount = 0;
  private readonly daily = new Map<string, DailyBucket>();
  private maxSeenDay = "";

  constructor(options: InMemoryUsageRepositoryOptions = {}) {
    this.maxRecent = Math.max(1, options.maxRecent ?? DEFAULT_MAX_RECENT);
    this.maxDays = Math.max(1, options.maxDays ?? DEFAULT_MAX_DAYS);
    this.recent = new Array<UsageRecordInput | undefined>(this.maxRecent).fill(undefined);
  }

  record(entry: UsageRecordInput): void {
    // 1) Detail: overwrite the oldest ring-buffer slot (no memory growth).
    this.recent[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.maxRecent;
    this.recordedCount++;

    // 2) Aggregates: increment the bucket (day x feature x model).
    const day = entry.at.slice(0, 10);
    if (day > this.maxSeenDay) {
      this.maxSeenDay = day;
    }
    const key = `${day}|${entry.feature}|${entry.model}`;
    const bucket = this.daily.get(key);
    if (bucket) {
      bucket.calls++;
      bucket.inputTokens += entry.inputTokens;
      bucket.outputTokens += entry.outputTokens;
      bucket.cachedTokens += entry.cachedTokens;
    } else {
      this.daily.set(key, {
        day,
        feature: entry.feature,
        model: entry.model,
        calls: 1,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        cachedTokens: entry.cachedTokens,
      });
    }

    // 3) Window: drop buckets older than maxDays relative to the most recent day.
    this.pruneOldDays();
  }

  private pruneOldDays(): void {
    // Comparing YYYY-MM-DD strings lexicographically = chronologically. The window covers maxDays days.
    const cutoff = shiftDay(this.maxSeenDay, -(this.maxDays - 1));
    for (const [key, bucket] of this.daily) {
      if (bucket.day < cutoff) {
        this.daily.delete(key);
      }
    }
  }

  async getReport(range: { fromDay: string; toDay: string }): Promise<UsageReport> {
    const buckets: UsageDailyBucket[] = [];
    for (const b of this.daily.values()) {
      if (b.day >= range.fromDay && b.day <= range.toDay) {
        buckets.push({
          day: b.day,
          feature: b.feature,
          model: b.model,
          calls: b.calls,
          inputTokens: b.inputTokens,
          outputTokens: b.outputTokens,
          cachedTokens: b.cachedTokens,
          costMinor: costMinorFromTokens(b.inputTokens, b.outputTokens),
        });
      }
    }
    // Stable order: by day, then by feature.
    buckets.sort((a, b) =>
      a.day === b.day ? a.feature.localeCompare(b.feature) : a.day.localeCompare(b.day),
    );
    return buckets;
  }

  async getOwnerReport(range: {
    fromDay: string;
    toDay: string;
  }): Promise<readonly OwnerUsageBucket[]> {
    // Based on the ring buffer (last N): in memory mode, the per-employee breakdown
    // covers only the recent records; postgres gives the full history for the period. Grouped by ownerId.
    const acc = new Map<
      string,
      { ownerId: string | null; calls: number; inputTokens: number; outputTokens: number }
    >();
    for (const item of this.recent) {
      if (!item) {
        continue;
      }
      const day = item.at.slice(0, 10);
      if (day < range.fromDay || day > range.toDay) {
        continue;
      }
      const key = item.ownerId ?? "";
      const cur = acc.get(key) ?? {
        ownerId: item.ownerId,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
      };
      cur.calls++;
      cur.inputTokens += item.inputTokens;
      cur.outputTokens += item.outputTokens;
      acc.set(key, cur);
    }
    return [...acc.values()]
      .map((o) => ({
        ownerId: o.ownerId,
        calls: o.calls,
        inputTokens: o.inputTokens,
        outputTokens: o.outputTokens,
        costMinor: costMinorFromTokens(o.inputTokens, o.outputTokens),
      }))
      .sort((a, b) => b.costMinor - a.costMinor);
  }

  async listRecent(limit: number): Promise<readonly UsageRecordInput[]> {
    const total = Math.min(this.recordedCount, this.maxRecent);
    const out: UsageRecordInput[] = [];
    for (let i = 1; i <= total && out.length < limit; i++) {
      const idx = (this.writeIndex - i + this.maxRecent) % this.maxRecent;
      const item = this.recent[idx];
      if (item) {
        out.push(item);
      }
    }
    return out;
  }
}

/** Shifts a YYYY-MM-DD date by `delta` days (UTC), returns YYYY-MM-DD. */
function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
