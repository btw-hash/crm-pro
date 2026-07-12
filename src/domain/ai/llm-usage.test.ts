import { describe, expect, it } from "vitest";
import { AI_FEATURES, costMinorFromTokens, isAiFeature } from "./llm-usage";

describe("costMinorFromTokens", () => {
  it("computes cents from the sum of input and output tokens at $0.05/1000", () => {
    // 600 + 400 = 1000 tokens x $0.05 = $0.05 = 5 cents
    expect(costMinorFromTokens(600, 400)).toBe(5);
  });

  it("zero tokens - zero cost", () => {
    expect(costMinorFromTokens(0, 0)).toBe(0);
  });

  it("reproduces a real invoice line: 47,175 input tokens ≈ $2.36", () => {
    // (47175 / 1000) x 0.05 x 100 = 235.875 -> rounds to 236 cents = $2.36
    expect(costMinorFromTokens(47175, 0)).toBe(236);
  });

  it("rounds to the nearest cent without accumulating error", () => {
    expect(costMinorFromTokens(123, 79)).toBe(1); // 202 tokens -> $0.0101 -> 1 cent
  });

  it("negative values are treated as zero (guards against corrupted usage)", () => {
    expect(costMinorFromTokens(-100, -50)).toBe(0);
  });
});

describe("isAiFeature", () => {
  it("accepts known labels and rejects arbitrary text", () => {
    expect(isAiFeature("assistant_plan")).toBe(true);
    expect(isAiFeature("web_answer")).toBe(true);
    expect(isAiFeature("John Smith +1900...")).toBe(false);
    expect(isAiFeature("")).toBe(false);
  });

  it("the label list covers 9 AI features", () => {
    expect(AI_FEATURES).toHaveLength(9);
  });
});
