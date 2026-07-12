/**
 * LLM token spend tracking (#216): domain types and deterministic costing.
 *
 * A pure domain — no external imports. Token counts come FROM the provider (fact,
 * `estimated:false`) or are estimated when absent (`estimated:true`). Cost is
 * computed DETERMINISTICALLY from tokens — the AI never invents it (project rule:
 * figures come from deterministic calculations). See [[crm-pro-project]].
 */

/** The AI feature that triggered the LLM call. A strict union — NOT free text (compliance: no raw PII). */
export type AiFeature =
  | "voice_to_act"
  | "activity_from_voice"
  | "proposal_text"
  | "manager_question"
  | "web_answer"
  | "assistant_plan"
  | "next_step"
  | "client_message"
  | "product_describe";

/** All `AiFeature` values — for input validation and listing in reports. */
export const AI_FEATURES: readonly AiFeature[] = [
  "voice_to_act",
  "activity_from_voice",
  "proposal_text",
  "manager_question",
  "web_answer",
  "assistant_plan",
  "next_step",
  "client_message",
  "product_describe",
];

/** A narrow check that a string belongs to `AiFeature` (for parsing persisted values). */
export function isAiFeature(value: string): value is AiFeature {
  return (AI_FEATURES as readonly string[]).includes(value);
}

/**
 * Actual (or estimated) token spend for a single LLM call.
 *
 * `inputTokens` is the FULL input (for Anthropic-style providers this is
 * input + cache_read + cache_creation; for others it's the raw input token
 * count). `cachedTokens` distinguishes three states: `undefined` — the
 * provider doesn't report it; `0` — reported, no cache hit (no prompt
 * caching); `>0` — how much of the input was served from cache.
 */
export interface LlmTokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens?: number;
  readonly totalTokens: number;
  /** true — usage was not returned by the provider and was estimated from text length. */
  readonly estimated: boolean;
}

/**
 * An approximate rate, $ per 1,000 tokens (demo estimate; comparable to a
 * mid-tier hosted LLM). A single rate for input/output — split by
 * provider/type later for realistic costing.
 */
export const USD_PER_1K_TOKENS = 0.05;

/**
 * The cost of a call in CENTS from actual tokens (input + output) at the flat
 * rate. Deterministic, no call to the AI. Cents — so amounts can be summed
 * without rounding loss. Negative values are treated as zero (guards
 * against corrupted usage data).
 */
export function costMinorFromTokens(inputTokens: number, outputTokens: number): number {
  const tokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);
  return Math.round((tokens / 1000) * USD_PER_1K_TOKENS * 100);
}
