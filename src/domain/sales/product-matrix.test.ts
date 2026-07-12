import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { createSalesOrder } from "./sales-order";
import { buildProductMatrix } from "./product-matrix";

const clientId = makeId<"ClientId">("c1") as ClientId;
const pA = makeId<"ProductId">("pa") as ProductId;
const pB = makeId<"ProductId">("pb") as ProductId;
const pC = makeId<"ProductId">("pc") as ProductId;
let n = 0;
function order(productId: ProductId, month: string, amount: number) {
  n += 1;
  return createSalesOrder({
    id: makeId<"SalesOrderId">(`o${n}`),
    clientId,
    managerId: "m1",
    orderedAt: `${month}-15T00:00:00.000Z`,
    lines: [{ productId, quantity: 1, amount: Money.dollars(amount) }],
  });
}

describe("buildProductMatrix", () => {
  const orders = [
    // pA — stable/growing in recent months
    order(pA, "2026-04", 1_000),
    order(pA, "2026-05", 1_000),
    order(pA, "2026-06", 1_100),
    // pB — last order 6 months ago → "gone" (dormant)
    order(pB, "2025-12", 900),
    // pC — high baseline, recently dropped → decline (down)
    order(pC, "2026-01", 2_000),
    order(pC, "2026-02", 2_000),
    order(pC, "2026-03", 2_000),
    order(pC, "2026-06", 500),
  ];
  const rows = buildProductMatrix(orders, "2026-06");
  const byId = new Map(rows.map((r) => [r.productId, r]));

  it("recent growth → up", () => {
    expect(byId.get(pA)?.trend).toBe("up");
    expect(byId.get(pA)?.monthsSinceLast).toBe(0);
  });

  it("no orders for ≥3 months → dormant with recency and last order month", () => {
    expect(byId.get(pB)?.trend).toBe("dormant");
    expect(byId.get(pB)?.monthsSinceLast).toBe(6);
    expect(byId.get(pB)?.lastOrderMonth).toBe("2025-12");
  });

  it("drop relative to the previous 3 months → down", () => {
    expect(byId.get(pC)?.trend).toBe("down");
  });

  it("sorted by 3-month revenue (descending)", () => {
    expect(rows.map((r) => r.productId)).toEqual([pA, pC, pB]);
  });
});
