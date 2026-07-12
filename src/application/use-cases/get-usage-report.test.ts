import { describe, expect, it } from "vitest";
import type {
  OwnerUsageBucket,
  UsageReportRepository,
} from "@/application/ports/usage-report-repository";
import { makeGetUsageOwnerReport } from "./get-usage-report";

function repoWith(buckets: OwnerUsageBucket[]): UsageReportRepository {
  return {
    getReport: async () => [],
    getOwnerReport: async () => buckets,
    listRecent: async () => [],
  };
}

describe("makeGetUsageOwnerReport", () => {
  it("sets a readable employee label and a system row for null", async () => {
    const report = makeGetUsageOwnerReport({
      usage: repoWith([
        { ownerId: "mop-owens", calls: 2, inputTokens: 100, outputTokens: 10, costMinor: 44 },
        { ownerId: null, calls: 1, inputTokens: 5, outputTokens: 1, costMinor: 0 },
      ]),
      labelOwner: (id) => (id === "mop-owens" ? "John Carter" : id),
    });

    const rows = await report({ fromDay: "2026-06-01", toDay: "2026-06-30" });

    expect(rows[0]).toMatchObject({ ownerId: "mop-owens", ownerLabel: "John Carter" });
    expect(rows[1]).toMatchObject({ ownerId: null, ownerLabel: "System / outside session" });
  });
});
