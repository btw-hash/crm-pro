import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { createSalesOrder } from "@/domain/sales/sales-order";
import { makeId } from "@/domain/shared/id";
import { analyzeAssortment } from "./assortment";

const premium = makeId<"ProductId">("premium") as ProductId;
const capsules = makeId<"ProductId">("capsules") as ProductId;
const dead = makeId<"ProductId">("dead") as ProductId;
const c1 = makeId<"ClientId">("c1") as ClientId;

function product(id: ProductId, name: string, margin: number): Product {
  return {
    id,
    sku: id,
    name,
    unit: "kg",
    kit: {
      category: "X",
      benefits: [],
      marginPercent: margin,
      shelfLife: "12 months",
      rsp: Money.dollars(2),
    },
  };
}

let n = 0;
function order(productId: ProductId, month: string, amount: number, qty: number) {
  n += 1;
  return createSalesOrder({
    id: makeId<"SalesOrderId">(`a${n}`),
    clientId: c1,
    managerId: "m1",
    orderedAt: `${month}-15T00:00:00.000Z`,
    lines: [{ productId, quantity: qty, amount: Money.dollars(amount) }],
  });
}

const products = [
  product(premium, "Premium Baking Chocolate", 40),
  product(capsules, "Muffin Capsules", 8),
  product(dead, "Stale Baking Gel", 30),
];

// Reference month of history = 2026-06. last3 = Apr–Jun, prior3 = Jan–Mar.
const orders = [
  // premium: growth (prior3 1,000 → last3 2,100), low unit count
  order(premium, "2026-02", 1_000, 110),
  order(premium, "2026-04", 1_000, 110),
  order(premium, "2026-06", 1_100, 120),
  // capsules: MANY units, little money (counter-example to naive ABC)
  order(capsules, "2026-05", 300, 2500),
  order(capsules, "2026-06", 300, 2500),
  // dead: last sale in February (4 months before June)
  order(dead, "2026-02", 500, 60),
];

describe("analyzeAssortment", () => {
  const rows = analyzeAssortment({ orders, products });
  const byId = new Map(rows.map((r) => [r.productId, r]));

  it("trends: growth / dead by sale recency", () => {
    expect(byId.get(premium)?.trend).toBe("growth");
    expect(byId.get(dead)?.trend).toBe("dead");
    expect(byId.get(dead)?.monthsSinceLastSale).toBe(4);
  });

  it("rank by gross margin (money×margin), premium is the most valuable", () => {
    expect(byId.get(premium)?.valueRank).toBe(1);
  });

  it("counter-example to naive ABC: capsules have MANY units, but value (and rank) is LOWER than premium", () => {
    const caps = byId.get(capsules);
    const prem = byId.get(premium);
    expect(caps && prem).toBeTruthy();
    expect(caps!.unitsLast3).toBeGreaterThan(prem!.unitsLast3); // units multiple times higher
    expect(caps!.grossMarginLast3Minor).toBeLessThan(prem!.grossMarginLast3Minor); // value is lower
    expect(caps!.valueRank).toBeGreaterThan(prem!.valueRank); // and rank is worse
  });
});
