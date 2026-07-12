import { describe, expect, it, vi } from "vitest";
import { ContourGuardLlmProvider } from "./contour-guard-llm-provider";
import { DataContourViolationError } from "./data-contour-guard";
import type { LlmProvider } from "./llm/llm-provider";

function fakeProvider(): LlmProvider {
  return {
    extractJson: vi.fn().mockResolvedValue({ ok: true }),
    completeText: vi.fn().mockResolvedValue("answer"),
    extractJsonWithUsage: vi.fn().mockResolvedValue({ value: { ok: true }, usage: null }),
    completeTextWithUsage: vi.fn().mockResolvedValue({ value: "answer", usage: null }),
  };
}

describe("ContourGuardLlmProvider", () => {
  it("BLOCKS an outbound call with a price -- the delegate is never called (#179 acceptance)", async () => {
    const inner = fakeProvider();
    const guarded = new ContourGuardLlmProvider(inner);

    await expect(
      guarded.completeText({ system: "assistant", user: "Client price $742.50" }),
    ).rejects.toBeInstanceOf(DataContourViolationError);
    expect(inner.completeText).not.toHaveBeenCalled();
  });

  it("blocks extractJson with a counterparty/tax ID", async () => {
    const inner = fakeProvider();
    const guarded = new ContourGuardLlmProvider(inner);
    await expect(
      guarded.extractJson({
        system: "s",
        user: "Victoria Foods LLC, EIN 39-0645511",
        toolName: "t",
        toolDescription: "d",
        schema: {},
      }),
    ).rejects.toBeInstanceOf(DataContourViolationError);
    expect(inner.extractJson).not.toHaveBeenCalled();
  });

  it("passes a clean payload through to the delegate", async () => {
    const inner = fakeProvider();
    const guarded = new ContourGuardLlmProvider(inner);
    await expect(
      guarded.completeText({ system: "s", user: "How many deals have stalled?" }),
    ).resolves.toBe("answer");
    expect(inner.completeText).toHaveBeenCalledOnce();
  });
});
