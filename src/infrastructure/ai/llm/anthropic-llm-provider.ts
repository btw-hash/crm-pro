import type { LlmTokenUsage } from "@/domain/ai/llm-usage";
import type { Logger } from "@/infrastructure/logging/logger";
import {
  type CompleteTextRequest,
  type ExtractJsonRequest,
  LlmError,
  type LlmProvider,
  type LlmResult,
} from "./llm-provider";

export interface AnthropicConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
}

interface RawBlock {
  readonly type: string;
  readonly name?: string;
  readonly text?: string;
  readonly input?: unknown;
}

/**
 * LLM adapter to the Claude Messages API via `fetch` (no SDK -- the project keeps
 * dependencies minimal; the same `LlmProvider` port is implemented by other HTTP
 * providers, e.g. OpenAI, where the Anthropic SDK doesn't apply).
 *
 * DATA_POLICY: this is a GLOBAL model -- suitable ONLY for code/anonymized/synthetic
 * data. Raw PII must go through the approved data-residency-compliant provider (another
 * adapter behind the same port). The key is server-only and never reaches the client
 * (called from composition-root). Default model is claude-opus-4-8 (see AI_MODEL).
 */
export class AnthropicLlmProvider implements LlmProvider {
  constructor(
    private readonly config: AnthropicConfig,
    private readonly logger: Logger,
  ) {}

  async extractJson(request: ExtractJsonRequest): Promise<unknown> {
    return (await this.extractJsonWithUsage(request)).value;
  }

  async extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>> {
    const data = await this.call({
      max_tokens: 1024,
      system: request.system,
      tools: [
        {
          name: request.toolName,
          description: request.toolDescription,
          input_schema: request.schema,
        },
      ],
      tool_choice: { type: "tool", name: request.toolName },
      messages: [{ role: "user", content: request.user }],
    });
    const block = this.blocks(data).find(
      (b) => b.type === "tool_use" && b.name === request.toolName,
    );
    if (!block || block.input === undefined) {
      throw new LlmError("LLM did not return a tool call for field extraction");
    }
    return { value: block.input, usage: extractUsage(data) };
  }

  async completeText(request: CompleteTextRequest): Promise<string> {
    return (await this.completeTextWithUsage(request)).value;
  }

  async completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>> {
    const data = await this.call({
      max_tokens: request.maxTokens ?? 1024,
      system: request.system,
      messages: [{ role: "user", content: request.user }],
    });
    const text = this.blocks(data)
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text) {
      throw new LlmError("LLM returned an empty text response");
    }
    return { value: text, usage: extractUsage(data) };
  }

  private async call(body: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/v1/messages`, {
        method: "POST",
        headers: {
          "x-api-key": this.config.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({ model: this.config.model, ...body }),
      });
    } catch (cause) {
      throw new LlmError("Network unavailable while calling the LLM", cause);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      // Log status only -- never the request body (may contain PII).
      this.logger.warn("llm.request_failed", { status: response.status });
      throw new LlmError(`LLM returned an error ${response.status}: ${detail.slice(0, 200)}`);
    }
    return response.json();
  }

  private blocks(data: unknown): readonly RawBlock[] {
    if (
      typeof data === "object" &&
      data !== null &&
      "content" in data &&
      Array.isArray((data as { content: unknown }).content)
    ) {
      return (data as { content: RawBlock[] }).content;
    }
    throw new LlmError("Unexpected LLM response format");
  }
}

/**
 * Actual token usage from the top-level `usage` (#216). Anthropic GOTCHA: `input_tokens`
 * is only the UNcached remainder; the full input = input_tokens + cache_read_input_tokens
 * + cache_creation_input_tokens. `cachedTokens` = cache_read (served from cache; 0 when
 * prompt caching is disabled -- the project's current state). usage missing/malformed ->
 * null (usage tracking is secondary and must not fail the main call).
 */
function extractUsage(data: unknown): LlmTokenUsage | null {
  if (typeof data !== "object" || data === null) return null;
  const usage = (data as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return null;
  const u = usage as Record<string, unknown>;
  const baseInput = numOrNull(u.input_tokens);
  const outputTokens = numOrNull(u.output_tokens);
  if (baseInput === null || outputTokens === null) return null;
  const cacheRead = numOr(u.cache_read_input_tokens, 0);
  const cacheCreate = numOr(u.cache_creation_input_tokens, 0);
  const inputTokens = baseInput + cacheRead + cacheCreate;
  return {
    inputTokens,
    outputTokens,
    cachedTokens: cacheRead,
    totalTokens: inputTokens + outputTokens,
    estimated: false,
  };
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
