import { describe, expect, it } from "vitest";
import { estimateLlmCost } from "./llm-cost";

describe("estimateLlmCost", () => {
  it("estimates tokens at ~4 characters per token", () => {
    expect(estimateLlmCost("a".repeat(400)).tokens).toBe(100);
    expect(estimateLlmCost("a".repeat(401)).tokens).toBe(101); // ceil
  });

  it("cost is proportional to tokens (cents)", () => {
    // 1000 tokens = 4000 characters -> $0.05 = 5 cents
    expect(estimateLlmCost("a".repeat(4000)).costMinor).toBe(5);
  });

  it("empty text -> 0", () => {
    expect(estimateLlmCost("")).toEqual({ tokens: 0, costMinor: 0 });
  });
});
