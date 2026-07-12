import { describe, expect, it } from "vitest";
import type { UsageRecordInput } from "@/application/ports/llm-usage-sink";
import { InMemoryUsageRepository } from "./in-memory-usage-repository";

function entry(over: Partial<UsageRecordInput> = {}): UsageRecordInput {
  return {
    feature: "assistant_plan",
    provider: "openai",
    model: "gpt-4o",
    inputTokens: 100,
    outputTokens: 20,
    cachedTokens: 0,
    estimated: false,
    ownerId: null,
    at: "2026-06-28T10:00:00.000Z",
    ...over,
  };
}

describe("InMemoryUsageRepository", () => {
  it("aggregates by day x feature x model and computes costMinor from tokens", async () => {
    const repo = new InMemoryUsageRepository();
    repo.record(entry({ inputTokens: 1000, outputTokens: 0 }));
    repo.record(entry({ inputTokens: 500, outputTokens: 500 }));

    const report = await repo.getReport({ fromDay: "2026-06-01", toDay: "2026-06-30" });

    expect(report).toHaveLength(1);
    expect(report[0]).toMatchObject({
      day: "2026-06-28",
      feature: "assistant_plan",
      calls: 2,
      inputTokens: 1500,
      outputTokens: 500,
    });
    // (1500 + 500) / 1000 x 0.05 x 100 = 10 cents
    expect(report[0]?.costMinor).toBe(10);
  });

  it("splits buckets by feature and model", async () => {
    const repo = new InMemoryUsageRepository();
    repo.record(entry({ feature: "assistant_plan" }));
    repo.record(entry({ feature: "web_answer" }));
    repo.record(entry({ feature: "web_answer", model: "gpt-4o-mini" }));

    const report = await repo.getReport({ fromDay: "2026-06-01", toDay: "2026-06-30" });

    expect(report).toHaveLength(3);
  });

  it("getReport filters by date range", async () => {
    const repo = new InMemoryUsageRepository();
    repo.record(entry({ at: "2026-06-10T00:00:00.000Z" }));
    repo.record(entry({ at: "2026-06-20T00:00:00.000Z" }));

    const report = await repo.getReport({ fromDay: "2026-06-15", toDay: "2026-06-30" });

    expect(report).toHaveLength(1);
    expect(report[0]?.day).toBe("2026-06-20");
  });

  it("listRecent returns the most recent records, newest first", async () => {
    const repo = new InMemoryUsageRepository({ maxRecent: 3 });
    repo.record(entry({ inputTokens: 1 }));
    repo.record(entry({ inputTokens: 2 }));
    repo.record(entry({ inputTokens: 3 }));

    const recent = await repo.listRecent(10);

    expect(recent.map((r) => r.inputTokens)).toEqual([3, 2, 1]);
  });

  it("ring buffer evicts the oldest records on overflow (size does not grow)", async () => {
    const repo = new InMemoryUsageRepository({ maxRecent: 2 });
    repo.record(entry({ inputTokens: 1 }));
    repo.record(entry({ inputTokens: 2 }));
    repo.record(entry({ inputTokens: 3 })); // evicts #1

    const recent = await repo.listRecent(10);

    expect(recent.map((r) => r.inputTokens)).toEqual([3, 2]);
  });

  it("maxDays window: buckets older than the window are removed", async () => {
    const repo = new InMemoryUsageRepository({ maxDays: 2 });
    repo.record(entry({ at: "2026-06-10T00:00:00.000Z" }));
    repo.record(entry({ at: "2026-06-11T00:00:00.000Z" }));
    repo.record(entry({ at: "2026-06-12T00:00:00.000Z" })); // window [11,12] — 10 falls out

    const report = await repo.getReport({ fromDay: "2026-01-01", toDay: "2026-12-31" });

    expect(report.map((b) => b.day).sort()).toEqual(["2026-06-11", "2026-06-12"]);
  });

  it("anti-OOM: the size of both structures does not grow with the number of records (50,000 calls)", async () => {
    const repo = new InMemoryUsageRepository({ maxRecent: 100, maxDays: 30 });
    for (let i = 0; i < 50_000; i++) {
      const day = 10 + (i % 20); // June 10..29 — 20 distinct days within the window
      repo.record(entry({ at: `2026-06-${day}T00:00:00.000Z`, inputTokens: 1 }));
    }

    const recent = await repo.listRecent(1000);
    expect(recent.length).toBeLessThanOrEqual(100); // ring buffer <= capacity

    const report = await repo.getReport({ fromDay: "2026-01-01", toDay: "2026-12-31" });
    expect(report.length).toBeLessThanOrEqual(30); // aggregates <= days x feature x model
  });

  it("getOwnerReport: aggregates by employee and sorts by cost descending", async () => {
    const repo = new InMemoryUsageRepository();
    repo.record(entry({ ownerId: "manager-smith", inputTokens: 1000, outputTokens: 0 }));
    repo.record(entry({ ownerId: "manager-smith", inputTokens: 500, outputTokens: 0 }));
    repo.record(entry({ ownerId: "head-alexander", inputTokens: 2000, outputTokens: 0 }));
    repo.record(entry({ ownerId: null, inputTokens: 100, outputTokens: 0 }));

    const report = await repo.getOwnerReport({ fromDay: "2026-06-01", toDay: "2026-06-30" });

    expect(report.map((r) => r.ownerId)).toEqual(["head-alexander", "manager-smith", null]);
    expect(report[1]).toMatchObject({ ownerId: "manager-smith", calls: 2, inputTokens: 1500 });
  });
});
