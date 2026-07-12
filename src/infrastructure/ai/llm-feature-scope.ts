import { AsyncLocalStorage } from "node:async_hooks";
import type { LlmFeatureScope } from "@/application/ports/llm-feature-scope";
import type { AiFeature } from "@/domain/ai/llm-usage";

/**
 * `LlmFeatureScope` implementation on top of `AsyncLocalStorage`: the feature tag is
 * bound to the async call context, so concurrent requests don't see each other's tags.
 * The token-usage decorator reads `current()` on every LLM call.
 *
 * An independent ALS instance — nests inside `pseudonymScope.run` without conflict
 * (the assistant's ReAct loop makes several LLM calls under both scopes at once).
 */
export class AsyncLocalStorageLlmFeatureScope implements LlmFeatureScope {
  private readonly storage = new AsyncLocalStorage<AiFeature>();

  run<T>(feature: AiFeature, fn: () => Promise<T>): Promise<T> {
    return this.storage.run(feature, fn);
  }

  current(): AiFeature | null {
    return this.storage.getStore() ?? null;
  }
}
