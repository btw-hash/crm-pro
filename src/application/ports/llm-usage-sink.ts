import type { AiFeature } from "@/domain/ai/llm-usage";

/**
 * A single LLM token-spend fact (#216). Numeric counters and enum tags only —
 * NOT A SINGLE BYTE of request/response body and no PII (GDPR/CCPA-style data
 * protection). `at` is an ISO timestamp (injected clock from the decorator). `estimated`
 * is true if the usage didn't come from the provider (no such records are written
 * today — the field is a placeholder for the future).
 */
export interface UsageRecordInput {
  readonly feature: AiFeature;
  readonly provider: string;
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly estimated: boolean;
  /** Surrogate id of the calling employee (NOT their name/email); null — outside a session. */
  readonly ownerId: string | null;
  readonly at: string;
}

/**
 * Sink for recording token spend. Synchronous `void` and does NOT throw: called
 * fire-and-forget from `UsageTrackingLlmProvider` — a telemetry failure must not
 * bring down the main LLM call (usage tracking is secondary).
 */
export interface LlmUsageSink {
  record(entry: UsageRecordInput): void;
}
