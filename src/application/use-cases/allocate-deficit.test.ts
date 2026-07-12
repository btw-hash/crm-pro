import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { makeAllocateDeficit } from "./allocate-deficit";
import type { DeficitRequestInput } from "@/domain/deficit/deficit-scoring";

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

describe("allocateDeficit use-case", () => {
  it("returns an allocation proposal without changing state", async () => {
    const useCase = makeAllocateDeficit();
    const result = await useCase({
      requests: [
        req("r1", { clientStatus: "A", needType: "production_stop", requestedQty: 50 }),
        req("r2", { clientStatus: "C", needType: "trial", requestedQty: 80 }),
      ],
      availableQty: 60,
    });

    expect(result.allocations).toHaveLength(2);
    expect(result.allocations.at(0)?.requestId).toBe(makeId<"DeficitRequestId">("r1"));
    expect(result.allocations.at(0)?.allocatedQty).toBe(50);
    expect(result.allocations.at(1)?.allocatedQty).toBe(10);
  });

  it("with zero available stock, everyone gets 0", async () => {
    const useCase = makeAllocateDeficit();
    const result = await useCase({
      requests: [req("r1"), req("r2")],
      availableQty: 0,
    });
    expect(result.allocations.every((a) => a.allocatedQty === 0)).toBe(true);
  });

  it("with a surplus, every request gets its full quantity", async () => {
    const useCase = makeAllocateDeficit();
    const result = await useCase({
      requests: [req("r1", { requestedQty: 40 }), req("r2", { requestedQty: 30 })],
      availableQty: 1000,
    });
    expect(result.allocations.every((a) => a.allocatedQty === a.requestedQty)).toBe(true);
  });
});
