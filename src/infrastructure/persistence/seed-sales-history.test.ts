import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { generateSeedSalesOrders } from "./seed-sales-history";

const clientId = makeId<"ClientId">("c1") as ClientId;
const pA = makeId<"ProductId">("pa") as ProductId;
const pB = makeId<"ProductId">("pb") as ProductId;

describe("generateSeedSalesOrders", () => {
  it("stable pattern → an order in each of the 12 months", () => {
    const orders = generateSeedSalesOrders([
      { clientId, managerId: "m1", productId: pA, base: 100_000, trend: "stable" },
    ]);
    expect(orders.length).toBe(12);
    expect(orders.every((o) => o.total.amountMinor > 0)).toBe(true);
  });

  it("declining → cuts off before the end of the period (a departing SKU)", () => {
    const orders = generateSeedSalesOrders([
      { clientId, managerId: "m1", productId: pA, base: 100_000, trend: "declining" },
    ]);
    expect(orders.length).toBeGreaterThan(0);
    expect(orders.length).toBeLessThan(12);
    const last = orders[orders.length - 1];
    if (!last) throw new Error("no orders");
    expect(last.orderedAt < "2026-06").toBe(true); // the last order is in the past
  });

  it("out-by + in-from → a product switch with a gap", () => {
    const orders = generateSeedSalesOrders([
      { clientId, managerId: "m1", productId: pA, base: 100_000, trend: "out-by", pivot: 5 },
      { clientId, managerId: "m1", productId: pB, base: 100_000, trend: "in-from", pivot: 7 },
    ]);
    const a = orders.filter((o) => o.lines[0]?.productId === pA);
    const b = orders.filter((o) => o.lines[0]?.productId === pB);
    expect(a).toHaveLength(6); // months 0..5
    expect(b).toHaveLength(5); // months 7..11 (a gap at month 6)
  });
});
