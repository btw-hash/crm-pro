import type { UsageRecordInput } from "./llm-usage-sink";

/**
 * Daily spend aggregate by (day × feature × model) for the manager's report (#216).
 * `costMinor` is NOT stored — it's computed deterministically from tokens at read
 * time (the rate can change; the AI doesn't invent it).
 */
export interface UsageDailyBucket {
  readonly day: string; // YYYY-MM-DD
  readonly feature: string;
  readonly model: string;
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly costMinor: number;
}

export type UsageReport = readonly UsageDailyBucket[];

/** Spend aggregate by employee for a period (#401) — "which manager is burning how much". */
export interface OwnerUsageBucket {
  readonly ownerId: string | null;
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costMinor: number;
}

/** Reads the spend log: aggregates over a date range and a breakdown of recent calls. */
export interface UsageReportRepository {
  /** Daily aggregates over the `[fromDay, toDay]` range (inclusive, YYYY-MM-DD days). */
  getReport(range: { fromDay: string; toDay: string }): Promise<UsageReport>;
  /** Spend aggregates by employee for a period (sorted by cost descending). */
  getOwnerReport(range: { fromDay: string; toDay: string }): Promise<readonly OwnerUsageBucket[]>;
  /** The most recent `limit` records (newest first) — a breakdown of "which calls cost what". */
  listRecent(limit: number): Promise<readonly UsageRecordInput[]>;
}
