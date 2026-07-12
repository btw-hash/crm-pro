import { describe, expect, it } from "vitest";
import type { UsageReport } from "@/application/ports/usage-report-repository";
import { buildUsageReportView, featureLabel } from "./usage-report-view";

function bucket(over: Partial<UsageReport[number]> = {}): UsageReport[number] {
  return {
    day: "2026-06-28",
    feature: "assistant_plan",
    model: "openai/gpt-4o",
    calls: 1,
    inputTokens: 100,
    outputTokens: 20,
    cachedTokens: 0,
    costMinor: 5,
    ...over,
  };
}

describe("buildUsageReportView", () => {
  it("sums totals across all buckets", () => {
    const view = buildUsageReportView([
      bucket({ calls: 2, inputTokens: 1000, outputTokens: 200, costMinor: 48 }),
      bucket({
        feature: "web_answer",
        calls: 1,
        inputTokens: 500,
        outputTokens: 100,
        costMinor: 24,
      }),
    ]);

    expect(view.totals).toEqual({
      calls: 3,
      inputTokens: 1500,
      outputTokens: 300,
      cachedTokens: 0,
      costMinor: 72,
    });
  });

  it("groups by feature and sorts by descending cost", () => {
    const view = buildUsageReportView([
      bucket({ feature: "assistant_plan", costMinor: 10 }),
      bucket({ feature: "web_answer", costMinor: 30 }),
      bucket({ feature: "assistant_plan", costMinor: 5 }),
    ]);

    expect(view.byFeature.map((r) => r.feature)).toEqual(["web_answer", "assistant_plan"]);
    expect(view.byFeature[0]).toMatchObject({ feature: "web_answer", costMinor: 30 });
    expect(view.byFeature[1]).toMatchObject({ feature: "assistant_plan", costMinor: 15, calls: 2 });
  });

  it("assigns a human-readable feature label", () => {
    const view = buildUsageReportView([bucket({ feature: "web_answer" })]);
    expect(view.byFeature[0]?.label).toBe("Assistant: web search answer");
  });

  it("empty report → zero totals and an empty breakdown", () => {
    const view = buildUsageReportView([]);
    expect(view.totals.costMinor).toBe(0);
    expect(view.byFeature).toEqual([]);
  });
});

describe("featureLabel", () => {
  it("returns an unknown label as-is (fallback)", () => {
    expect(featureLabel("unknown_feature")).toBe("unknown_feature");
  });
});
