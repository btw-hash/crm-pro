/**
 * Rough ESTIMATE of the cost of an LLM call based on text volume (#216, "LLM request
 * cost tracking"). ~4 characters per token; the rate is a reference point (OpenAI
 * pricing). This is an estimate for cost-control purposes, not an exact invoice from
 * the provider (the provider reports its own token counts separately).
 */

import { USD_PER_1K_TOKENS } from "@/domain/ai/llm-usage";

const CHARS_PER_TOKEN = 4;

export interface LlmCostEstimate {
  readonly tokens: number;
  /** Cost in cents (for aggregation without rounding loss). */
  readonly costMinor: number;
}

export function estimateLlmCost(text: string): LlmCostEstimate {
  const tokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  const costMinor = Math.round((tokens / 1000) * USD_PER_1K_TOKENS * 100);
  return { tokens, costMinor };
}
