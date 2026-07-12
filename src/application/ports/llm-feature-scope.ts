import type { AiFeature } from "@/domain/ai/llm-usage";

/**
 * Per-request tag for the AI feature that triggered the LLM call (#216). Mirrors
 * `PseudonymScope`: the gateway/use-case sets the tag for the duration of the call via
 * `run`, and the token-usage-tracking decorator (`UsageTrackingLlmProvider`) reads it
 * via `current()` when it records the spend.
 *
 * Why a scope instead of a parameter: the tag isn't needed in the provider-neutral
 * `LlmProvider` contract and shouldn't be threaded through the gateway's 9 methods.
 * The implementation in infrastructure (`AsyncLocalStorage`) isolates concurrent requests.
 */
export interface LlmFeatureScope {
  /** Run `fn` under the active feature tag (visible to nested AI calls). */
  run<T>(feature: AiFeature, fn: () => Promise<T>): Promise<T>;
  /** The active feature tag (or null outside of `run`). */
  current(): AiFeature | null;
}
