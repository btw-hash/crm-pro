/**
 * Guard against a human configuration mistake: in production you cannot accidentally
 * send real PII to a GLOBAL LLM (Claude) -- that's a cross-border data transfer under
 * a GDPR-style data-residency policy. So in production with a global provider the
 * startup is blocked unless ALLOW_GLOBAL_LLM=true is explicitly set (for synthetic/demo
 * data).
 */

/** Providers outside the compliant contour. The approved provider (openai) is not in it. */
const GLOBAL_LLM_PROVIDERS = new Set(["anthropic"]);

export class GlobalLlmInProductionError extends Error {
  constructor(provider: string) {
    super(
      `Startup blocked: AI_PROVIDER=${provider} is a global LLM, not allowed for real PII ` +
        `in production under the data-residency policy. Use the compliant provider ` +
        `(AI_PROVIDER=openai). If the data is synthetic/anonymized, explicitly set ` +
        `ALLOW_GLOBAL_LLM=true.`,
    );
    this.name = "GlobalLlmInProductionError";
  }
}

export function assertProviderCompliant(args: {
  readonly mode: "stub" | "live";
  readonly provider: string;
  readonly isProduction: boolean;
  readonly allowGlobal: boolean;
}): void {
  if (args.mode !== "live") {
    return; // the stub never sends anything outward
  }
  if (GLOBAL_LLM_PROVIDERS.has(args.provider) && args.isProduction && !args.allowGlobal) {
    throw new GlobalLlmInProductionError(args.provider);
  }
}

export function isGlobalLlmProvider(provider: string): boolean {
  return GLOBAL_LLM_PROVIDERS.has(provider);
}
