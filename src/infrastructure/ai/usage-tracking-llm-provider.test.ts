import { describe, expect, it, vi } from "vitest";
import type { LlmFeatureScope } from "@/application/ports/llm-feature-scope";
import type { LlmUsageSink, UsageRecordInput } from "@/application/ports/llm-usage-sink";
import type { AiFeature, LlmTokenUsage } from "@/domain/ai/llm-usage";
import type { LlmProvider } from "./llm/llm-provider";
import { UsageTrackingLlmProvider } from "./usage-tracking-llm-provider";

/** Recording is now fire-and-forget (ownerId resolves async) -- let the microtask finish. */
const flush = () => new Promise((r) => setTimeout(r, 0));

function fixedFeatureScope(feature: AiFeature | null): LlmFeatureScope {
  return { run: (_feature, fn) => fn(), current: () => feature };
}

function innerWithUsage(usage: LlmTokenUsage | null): LlmProvider {
  return {
    extractJson: vi.fn(),
    completeText: vi.fn(),
    extractJsonWithUsage: vi.fn().mockResolvedValue({ value: { ok: true }, usage }),
    completeTextWithUsage: vi.fn().mockResolvedValue({ value: "answer", usage }),
  };
}

function options(
  sink: LlmUsageSink,
  feature: AiFeature | null,
  resolveOwnerId?: () => Promise<string | null>,
): ConstructorParameters<typeof UsageTrackingLlmProvider>[1] {
  return {
    sink,
    featureScope: fixedFeatureScope(feature),
    provider: "openai",
    model: "gpt-4o",
    now: () => "2026-06-28T10:00:00.000Z",
    ...(resolveOwnerId ? { resolveOwnerId } : {}),
  };
}

describe("UsageTrackingLlmProvider", () => {
  it("writes the spend fact with the feature label and returns .value outward", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const inner = innerWithUsage({
      inputTokens: 100,
      outputTokens: 20,
      cachedTokens: 5,
      totalTokens: 120,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(inner, options(sink, "assistant_plan"));

    const text = await provider.completeText({ system: "s", user: "u" });
    await flush();

    expect(text).toBe("answer");
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      feature: "assistant_plan",
      provider: "openai",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 20,
      cachedTokens: 5,
      ownerId: null,
      at: "2026-06-28T10:00:00.000Z",
    });
  });

  it("usage=null -> no record is written, the text is still returned", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const provider = new UsageTrackingLlmProvider(
      innerWithUsage(null),
      options(sink, "web_answer"),
    );

    const text = await provider.completeText({ system: "s", user: "u" });
    await flush();

    expect(text).toBe("answer");
    expect(records).toHaveLength(0);
  });

  it("no active feature label -> the record is skipped", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const inner = innerWithUsage({
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(inner, options(sink, null));

    await provider.completeText({ system: "s", user: "u" });
    await flush();

    expect(records).toHaveLength(0);
  });

  it("a sink.record failure does not fail the main call", async () => {
    const sink: LlmUsageSink = {
      record: () => {
        throw new Error("db down");
      },
    };
    const inner = innerWithUsage({
      inputTokens: 1,
      outputTokens: 1,
      totalTokens: 2,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(inner, options(sink, "next_step"));

    await expect(provider.completeText({ system: "s", user: "u" })).resolves.toBe("answer");
    await flush();
  });

  it("cachedTokens undefined (no cache reporting) is normalized to 0 on write", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const inner = innerWithUsage({
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(inner, options(sink, "voice_to_act"));

    await provider.completeText({ system: "s", user: "u" });
    await flush();

    expect(records[0]?.cachedTokens).toBe(0);
  });

  it("extractJson is also tracked and returns the parsed value", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const inner = innerWithUsage({
      inputTokens: 7,
      outputTokens: 3,
      totalTokens: 10,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(inner, options(sink, "client_message"));

    const value = await provider.extractJson({
      system: "s",
      user: "u",
      toolName: "t",
      toolDescription: "d",
      schema: {},
    });
    await flush();

    expect(value).toEqual({ ok: true });
    expect(records).toHaveLength(1);
    expect(records[0]?.feature).toBe("client_message");
  });

  it("ownerId from resolveOwnerId lands in the record (#401)", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const inner = innerWithUsage({
      inputTokens: 5,
      outputTokens: 5,
      totalTokens: 10,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(
      inner,
      options(sink, "assistant_plan", async () => "sam-griffin"),
    );

    await provider.completeText({ system: "s", user: "u" });
    await flush();

    expect(records[0]?.ownerId).toBe("sam-griffin");
  });

  it("a resolveOwnerId failure does not fail the record -- ownerId=null", async () => {
    const records: UsageRecordInput[] = [];
    const sink: LlmUsageSink = { record: (e) => records.push(e) };
    const inner = innerWithUsage({
      inputTokens: 5,
      outputTokens: 5,
      totalTokens: 10,
      estimated: false,
    });
    const provider = new UsageTrackingLlmProvider(
      inner,
      options(sink, "assistant_plan", async () => {
        throw new Error("no session");
      }),
    );

    await provider.completeText({ system: "s", user: "u" });
    await flush();

    expect(records).toHaveLength(1);
    expect(records[0]?.ownerId).toBeNull();
  });
});
