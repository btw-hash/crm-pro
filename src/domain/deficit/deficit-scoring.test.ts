import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { allocateDeficit, scoreRequest } from "./deficit-scoring";
import type { DeficitRequestInput } from "./deficit-scoring";

function req(
  id: string,
  overrides: Partial<Omit<DeficitRequestInput, "requestId">> = {},
): DeficitRequestInput {
  return {
    requestId: makeId<"DeficitRequestId">(id),
    clientStatus: "B",
    needType: "scheduled",
    shelfLifeDays: 15,
    marginPercent: 50,
    requestedQty: 100,
    ...overrides,
  };
}

describe("scoreRequest", () => {
  it("A + production_stop + 0 days + 100% margin = 100", () => {
    expect(
      scoreRequest({
        clientStatus: "A",
        needType: "production_stop",
        shelfLifeDays: 0,
        marginPercent: 100,
      }),
    ).toBe(100);
  });

  it("C + trial + 30 days + 0% margin = 16", () => {
    expect(
      scoreRequest({ clientStatus: "C", needType: "trial", shelfLifeDays: 30, marginPercent: 0 }),
    ).toBe(16);
  });

  it("client status: A=40, B=25, C=10, all else equal", () => {
    const base = { needType: "scheduled" as const, shelfLifeDays: 15, marginPercent: 50 };
    const scoreA = scoreRequest({ clientStatus: "A", ...base });
    const scoreB = scoreRequest({ clientStatus: "B", ...base });
    const scoreC = scoreRequest({ clientStatus: "C", ...base });
    expect(scoreA).toBeGreaterThan(scoreB);
    expect(scoreB).toBeGreaterThan(scoreC);
    expect(scoreA - scoreB).toBe(15);
    expect(scoreB - scoreC).toBe(15);
  });

  it("need type: production_stop > scheduled > trial", () => {
    const base = { clientStatus: "B" as const, shelfLifeDays: 15, marginPercent: 50 };
    expect(scoreRequest({ needType: "production_stop", ...base })).toBeGreaterThan(
      scoreRequest({ needType: "scheduled", ...base }),
    );
    expect(scoreRequest({ needType: "scheduled", ...base })).toBeGreaterThan(
      scoreRequest({ needType: "trial", ...base }),
    );
  });

  it("0 days of shelf life gives the max 20 points, 30 days gives 0", () => {
    const base = { clientStatus: "B" as const, needType: "scheduled" as const, marginPercent: 0 };
    const s0 = scoreRequest({ shelfLifeDays: 0, ...base });
    const s30 = scoreRequest({ shelfLifeDays: 30, ...base });
    expect(s0 - s30).toBe(20);
  });

  it("clamps shelfLifeDays and marginPercent to their bounds", () => {
    const s1 = scoreRequest({
      clientStatus: "A",
      needType: "production_stop",
      shelfLifeDays: -5,
      marginPercent: 150,
    });
    const s2 = scoreRequest({
      clientStatus: "A",
      needType: "production_stop",
      shelfLifeDays: 0,
      marginPercent: 100,
    });
    expect(s1).toBe(s2);
  });
});

describe("allocateDeficit", () => {
  it("sorts by descending score and allocates greedily", () => {
    const requests = [
      req("r1", { clientStatus: "C", needType: "trial", requestedQty: 50 }),
      req("r2", { clientStatus: "A", needType: "production_stop", requestedQty: 80 }),
      req("r3", { clientStatus: "B", needType: "scheduled", requestedQty: 60 }),
    ];
    const result = allocateDeficit(requests, 120);

    expect(result.at(0)?.requestId).toBe(makeId<"DeficitRequestId">("r2"));
    expect(result.at(0)?.allocatedQty).toBe(80);
    expect(result.at(1)?.requestId).toBe(makeId<"DeficitRequestId">("r3"));
    expect(result.at(1)?.allocatedQty).toBe(40);
    expect(result.at(2)?.requestId).toBe(makeId<"DeficitRequestId">("r1"));
    expect(result.at(2)?.allocatedQty).toBe(0);
  });

  it("gives everyone the full volume when supply is sufficient", () => {
    const requests = [req("r1", { requestedQty: 50 }), req("r2", { requestedQty: 70 })];
    const result = allocateDeficit(requests, 500);
    expect(result.every((a) => a.allocatedQty === a.requestedQty)).toBe(true);
  });

  it("zero remaining stock - everyone gets 0", () => {
    const result = allocateDeficit([req("r1"), req("r2")], 0);
    expect(result.every((a) => a.allocatedQty === 0)).toBe(true);
  });

  it("negative remaining stock is treated as 0", () => {
    const result = allocateDeficit([req("r1")], -10);
    expect(result.at(0)?.allocatedQty).toBe(0);
  });

  it("returns a score for every entry", () => {
    const result = allocateDeficit([req("r1")], 100);
    expect(result.at(0)?.score).toBeGreaterThan(0);
  });
});
