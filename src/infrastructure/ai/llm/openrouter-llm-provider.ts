import type { LlmTokenUsage } from "@/domain/ai/llm-usage";
import type { Logger } from "@/infrastructure/logging/logger";
import {
  type CompleteTextRequest,
  type ExtractJsonRequest,
  LlmError,
  type LlmProvider,
  type LlmResult,
} from "./llm-provider";

export interface OpenRouterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly baseUrl: string;
}

/** Hard cap enforced regardless of what a caller asks for -- this adapter is only used
 * on the demo deployment, where a runaway prompt must never turn into a runaway bill. */
const MAX_TOKENS_CAP = 1024;

interface ToolCall {
  readonly function?: { readonly name?: string; readonly arguments?: string };
}

interface ChatMessage {
  readonly content?: string | null;
  readonly tool_calls?: readonly ToolCall[];
}

/**
 * LLM adapter to OpenRouter (openrouter.ai) via `fetch` (no SDK -- same convention as
 * the Anthropic/OpenAI adapters). OpenRouter's API is OpenAI Chat Completions-compatible
 * (tools/tool_choice function calling for extractJson, plain assistant content for
 * completeText), so the request/response shapes mirror `OpenAiLlmProvider`.
 *
 * DATA_POLICY: OpenRouter proxies to third-party model hosts -- treated as a GLOBAL
 * model, same contour as Claude (see composition-root, ADR-0007's ContourGuardLlmProvider
 * applies). This adapter is demo-only: `MAX_TOKENS_CAP` bounds cost per call regardless
 * of the caller's request; the daily call budget is enforced one layer up, by
 * `BudgetCappedAiGateway` (a per-call cap here would still let a request through right
 * at the boundary -- the gateway-level cap is the actual stop).
 */
export class OpenRouterLlmProvider implements LlmProvider {
  constructor(
    private readonly config: OpenRouterConfig,
    private readonly logger: Logger,
  ) {}

  async extractJson(request: ExtractJsonRequest): Promise<unknown> {
    return (await this.extractJsonWithUsage(request)).value;
  }

  async extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>> {
    const data = await this.call({
      max_tokens: MAX_TOKENS_CAP,
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: request.toolName,
            description: request.toolDescription,
            parameters: request.schema,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: request.toolName } },
    });
    const message = this.message(data);
    const call = message.tool_calls?.find((c) => c.function?.name === request.toolName);
    if (!call?.function?.arguments) {
      throw new LlmError("LLM did not return a tool call for field extraction");
    }
    let value: unknown;
    try {
      value = JSON.parse(call.function.arguments);
    } catch (cause) {
      throw new LlmError("Failed to parse the tool call arguments as JSON", cause);
    }
    return { value, usage: extractUsage(data) };
  }

  async completeText(request: CompleteTextRequest): Promise<string> {
    return (await this.completeTextWithUsage(request)).value;
  }

  async completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>> {
    const data = await this.call({
      max_tokens: Math.min(request.maxTokens ?? MAX_TOKENS_CAP, MAX_TOKENS_CAP),
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
    });
    const text = (this.message(data).content ?? "").trim();
    if (!text) {
      throw new LlmError("LLM returned an empty text response");
    }
    return { value: text, usage: extractUsage(data) };
  }

  private async call(body: Record<string, unknown>): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
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

  private message(data: unknown): ChatMessage {
    if (
      typeof data === "object" &&
      data !== null &&
      "choices" in data &&
      Array.isArray((data as { choices: unknown }).choices)
    ) {
      const first = (data as { choices: readonly { message?: ChatMessage }[] }).choices[0];
      if (first?.message) {
        return first.message;
      }
    }
    throw new LlmError("Unexpected LLM response format");
  }
}

/**
 * Actual token usage from the top-level `usage` (#216), same shape as the OpenAI
 * adapter (OpenRouter passes the upstream provider's usage through verbatim). usage
 * missing/malformed -> null (usage tracking is secondary and must not fail the main call).
 */
function extractUsage(data: unknown): LlmTokenUsage | null {
  if (typeof data !== "object" || data === null) return null;
  const usage = (data as { usage?: unknown }).usage;
  if (typeof usage !== "object" || usage === null) return null;
  const u = usage as Record<string, unknown>;
  const inputTokens = numOrNull(u.prompt_tokens);
  const outputTokens = numOrNull(u.completion_tokens);
  if (inputTokens === null || outputTokens === null) return null;
  const details = u.prompt_tokens_details;
  const cachedTokens =
    typeof details === "object" && details !== null
      ? numOr((details as Record<string, unknown>).cached_tokens, 0)
      : 0;
  const totalTokens = numOr(u.total_tokens, inputTokens + outputTokens);
  return {
    inputTokens,
    outputTokens,
    cachedTokens,
    totalTokens,
    estimated: false,
  };
}

function numOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
