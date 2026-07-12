import type { LlmFeatureScope } from "@/application/ports/llm-feature-scope";
import type { LlmUsageSink } from "@/application/ports/llm-usage-sink";
import type { AiFeature, LlmTokenUsage } from "@/domain/ai/llm-usage";
import type {
  CompleteTextRequest,
  ExtractJsonRequest,
  LlmProvider,
  LlmResult,
} from "./llm/llm-provider";

export interface UsageTrackingOptions {
  readonly sink: LlmUsageSink;
  readonly featureScope: LlmFeatureScope;
  /** Provider name (openai/anthropic) -- written into the usage record. */
  readonly provider: string;
  /** Model name -- written into the usage record. */
  readonly model: string;
  /** Clock (ISO) -- injectable for determinism in tests. */
  readonly now: () => string;
  /** Resolver for the calling employee's id (from the session). Absent -> ownerId is always null. */
  readonly resolveOwnerId?: () => Promise<string | null>;
}

/**
 * Outermost `LlmProvider` decorator (#216): on every call, reads the actual usage from
 * the result and the feature label from `featureScope`, writes the spend fact to `sink`.
 * Returns the same contract outward (string/unknown), staying compatible with the gateway.
 *
 * Does NOT block and does NOT fail the main call: `sink.record` is a synchronous void,
 * its errors are swallowed. If usage didn't arrive (null) or there's no active feature
 * label, the record is skipped (usage tracking is secondary). Data-residency policy:
 * only token counts + labels go into the record.
 */
export class UsageTrackingLlmProvider implements LlmProvider {
  constructor(
    private readonly inner: LlmProvider,
    private readonly options: UsageTrackingOptions,
  ) {}

  async extractJson(request: ExtractJsonRequest): Promise<unknown> {
    const result = await this.inner.extractJsonWithUsage(request);
    this.track(result.usage);
    return result.value;
  }

  async completeText(request: CompleteTextRequest): Promise<string> {
    const result = await this.inner.completeTextWithUsage(request);
    this.track(result.usage);
    return result.value;
  }

  async extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>> {
    const result = await this.inner.extractJsonWithUsage(request);
    this.track(result.usage);
    return result;
  }

  async completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>> {
    const result = await this.inner.completeTextWithUsage(request);
    this.track(result.usage);
    return result;
  }

  /** Writes the spend fact if usage and an active feature label are present. Never throws. */
  private track(usage: LlmTokenUsage | null): void {
    if (!usage) {
      return; // the provider didn't return usage -- don't write (a fact beats an estimate, see MVP decision)
    }
    const feature = this.options.featureScope.current();
    if (!feature) {
      return; // call outside featureScope -- nothing to attribute the spend to
    }
    // feature/usage are captured synchronously; ownerId requires reading the session
    // (async) -- write fire-and-forget so the main call isn't blocked. Failure/outside a
    // session -> ownerId null.
    void this.record(usage, feature);
  }

  private async record(usage: LlmTokenUsage, feature: AiFeature): Promise<void> {
    let ownerId: string | null;
    try {
      ownerId = this.options.resolveOwnerId ? await this.options.resolveOwnerId() : null;
    } catch {
      ownerId = null; // outside a request context the session is unavailable -- write without attribution
    }
    try {
      this.options.sink.record({
        feature,
        provider: this.options.provider,
        model: this.options.model,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedTokens: usage.cachedTokens ?? 0,
        estimated: usage.estimated,
        ownerId,
        at: this.options.now(),
      });
    } catch {
      // A telemetry failure must not fail the main LLM call (usage tracking is secondary).
    }
  }
}
