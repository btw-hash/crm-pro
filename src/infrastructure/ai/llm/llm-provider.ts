/**
 * Low-level boundary with an LLM provider (Claude / OpenAI over HTTP). Provider-neutral:
 * `LlmAiGateway` builds prompts, function-calling schemas and parses the result on top of
 * it. Concrete adapters live in this same folder. Provider selection happens in
 * composition-root via `AI_PROVIDER` (see DATA_POLICY: real PII -> only the approved
 * data-residency-compliant provider).
 */

import type { LlmTokenUsage } from "@/domain/ai/llm-usage";

export type JsonSchema = Record<string, unknown>;

export interface ExtractJsonRequest {
  readonly system: string;
  readonly user: string;
  /** Tool name (function calling) -- the model is required to call it. */
  readonly toolName: string;
  readonly toolDescription: string;
  readonly schema: JsonSchema;
}

export interface CompleteTextRequest {
  readonly system: string;
  readonly user: string;
  readonly maxTokens?: number;
}

/**
 * Result of an LLM call together with actual token usage (#216). `usage` is null if the
 * provider didn't return it: usage tracking is secondary and must not fail the main call.
 */
export interface LlmResult<T> {
  readonly value: T;
  readonly usage: LlmTokenUsage | null;
}

export interface LlmProvider {
  /** Structured extraction via function calling: returns the tool call arguments. */
  extractJson(request: ExtractJsonRequest): Promise<unknown>;
  /** Free-form text for a prompt. */
  completeText(request: CompleteTextRequest): Promise<string>;
  /** Like `extractJson`, but with actual usage (token accounting, #216). */
  extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>>;
  /** Like `completeText`, but with actual usage (token accounting, #216). */
  completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>>;
}

export class LlmError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "LlmError";
  }
}
