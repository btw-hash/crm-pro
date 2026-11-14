import { afterEach, describe, expect, it, vi } from "vitest";
import { LlmError } from "./llm-provider";
import { OpenAiLlmProvider } from "./openai-llm-provider";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const config = { apiKey: "sk-test", model: "gpt-4o", baseUrl: "https://api.openai.com/v1" };

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

function reply(content: string) {
  return { choices: [{ message: { role: "assistant", content } }] };
}

function toolReply(name: string, args: unknown) {
  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: null,
          tool_calls: [{ function: { name, arguments: JSON.stringify(args) } }],
        },
      },
    ],
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("OpenAiLlmProvider", () => {
  it("extractJson forces a tool call and returns its arguments", async () => {
    const fetchMock = mockFetch({
      ok: true,
      body: toolReply("draft", { productName: "Coverlux" }),
    });
    const provider = new OpenAiLlmProvider(config, logger);

    const result = await provider.extractJson({
      system: "sys",
      user: "report",
      toolName: "draft",
      toolDescription: "desc",
      schema: { type: "object" },
    });

    expect(result).toEqual({ productName: "Coverlux" });
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [url, init] = call;
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(init.headers.authorization).toBe("Bearer sk-test");
    const sent = JSON.parse(init.body);
    expect(sent.model).toBe("gpt-4o");
    expect(sent.tool_choice).toEqual({ type: "function", function: { name: "draft" } });
  });

  it("completeText returns the message content", async () => {
    mockFetch({ ok: true, body: reply("Dear partner!") });
    const provider = new OpenAiLlmProvider(config, logger);

    expect(await provider.completeText({ system: "s", user: "u" })).toBe("Dear partner!");
  });

  it("throws LlmError on non-2xx and does not log the request body", async () => {
    mockFetch({ ok: false, status: 401, body: { error: "unauthorized" } });
    const provider = new OpenAiLlmProvider(config, logger);

    await expect(provider.completeText({ system: "s", user: "u" })).rejects.toBeInstanceOf(
      LlmError,
    );
    expect(logger.warn).toHaveBeenCalledWith("llm.request_failed", { status: 401 });
  });

  it("throws LlmError if the response has no tool call", async () => {
    mockFetch({ ok: true, body: reply("just chatting") });
    const provider = new OpenAiLlmProvider(config, logger);

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

  it("completeTextWithUsage: cachedTokens from prompt_tokens_details, totalTokens from usage", async () => {
    mockFetch({
      ok: true,
      body: {
        choices: [{ message: { role: "assistant", content: "answer" } }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 40,
          total_tokens: 140,
          prompt_tokens_details: { cached_tokens: 25 },
        },
      },
    });
    const provider = new OpenAiLlmProvider(config, logger);

    const { value, usage } = await provider.completeTextWithUsage({ system: "s", user: "u" });

    expect(value).toBe("answer");
    expect(usage).toEqual({
      inputTokens: 100,
      outputTokens: 40,
      cachedTokens: 25,
      totalTokens: 140,
      estimated: false,
    });
  });

  it("usage without prompt_tokens_details -> cachedTokens=0", async () => {
    mockFetch({
      ok: true,
      body: {
        choices: [{ message: { role: "assistant", content: "ok" } }],
        usage: { prompt_tokens: 50, completion_tokens: 20, total_tokens: 70 },
      },
    });
    const provider = new OpenAiLlmProvider(config, logger);

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
