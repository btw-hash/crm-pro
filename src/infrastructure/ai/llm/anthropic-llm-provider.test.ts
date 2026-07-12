import { afterEach, describe, expect, it, vi } from "vitest";
import { AnthropicLlmProvider } from "./anthropic-llm-provider";
import { LlmError } from "./llm-provider";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const config = { apiKey: "sk-test", model: "claude-opus-4-8", baseUrl: "https://api.example" };

function mockFetch(payload: { ok: boolean; status?: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: payload.ok,
    status: payload.status ?? 200,
    json: async () => payload.body,
    text: async () => JSON.stringify(payload.body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("AnthropicLlmProvider", () => {
  it("extractJson forces a tool call and returns its arguments", async () => {
    const fetchMock = mockFetch({
      ok: true,
      body: { content: [{ type: "tool_use", name: "draft", input: { productName: "Carat" } }] },
    });
    const provider = new AnthropicLlmProvider(config, logger);

    const result = await provider.extractJson({
      system: "sys",
      user: "report",
      toolName: "draft",
      toolDescription: "desc",
      schema: { type: "object" },
    });

    expect(result).toEqual({ productName: "Carat" });
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [url, init] = call;
    expect(url).toBe("https://api.example/v1/messages");
    expect(init.headers["x-api-key"]).toBe("sk-test");
    expect(init.headers["anthropic-version"]).toBe("2023-06-01");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("claude-opus-4-8");
    expect(sent.tool_choice).toEqual({ type: "tool", name: "draft" });
  });

  it("completeText joins text blocks", async () => {
    mockFetch({
      ok: true,
      body: {
        content: [
          { type: "text", text: "Dear " },
          { type: "text", text: "partner!" },
        ],
      },
    });
    const provider = new AnthropicLlmProvider(config, logger);

    expect(await provider.completeText({ system: "s", user: "u" })).toBe("Dear partner!");
  });

  it("throws LlmError on non-2xx and does not log the request body", async () => {
    mockFetch({ ok: false, status: 401, body: { error: "unauthorized" } });
    const provider = new AnthropicLlmProvider(config, logger);

    await expect(provider.completeText({ system: "s", user: "u" })).rejects.toBeInstanceOf(
      LlmError,
    );
    expect(logger.warn).toHaveBeenCalledWith("llm.request_failed", { status: 401 });
  });

  it("throws LlmError if the response has no tool call", async () => {
    mockFetch({ ok: true, body: { content: [{ type: "text", text: "chatter" }] } });
    const provider = new AnthropicLlmProvider(config, logger);

    await expect(
      provider.extractJson({
        system: "s",
        user: "u",
        toolName: "draft",
        toolDescription: "d",
        schema: {},
      }),
    ).rejects.toBeInstanceOf(LlmError);
  });

  it("completeTextWithUsage: full input = input + cache_read + cache_creation; cachedTokens=cache_read", async () => {
    mockFetch({
      ok: true,
      body: {
        content: [{ type: "text", text: "answer" }],
        usage: {
          input_tokens: 100,
          output_tokens: 40,
          cache_read_input_tokens: 25,
          cache_creation_input_tokens: 10,
        },
      },
    });
    const provider = new AnthropicLlmProvider(config, logger);

    const { value, usage } = await provider.completeTextWithUsage({ system: "s", user: "u" });

    expect(value).toBe("answer");
    expect(usage).toEqual({
      inputTokens: 135, // 100 + 25 + 10 -- full processed input
      outputTokens: 40,
      cachedTokens: 25,
      totalTokens: 175,
      estimated: false,
    });
  });

  it("usage without cache fields -> cachedTokens=0, input=input_tokens", async () => {
    mockFetch({
      ok: true,
      body: {
        content: [{ type: "text", text: "ok" }],
        usage: { input_tokens: 50, output_tokens: 20 },
      },
    });
    const provider = new AnthropicLlmProvider(config, logger);

    const { usage } = await provider.completeTextWithUsage({ system: "s", user: "u" });

    expect(usage).toEqual({
      inputTokens: 50,
      outputTokens: 20,
      cachedTokens: 0,
      totalTokens: 70,
      estimated: false,
    });
  });
});
