import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { createSalesOrder } from "./sales-order";
import { shiftMonth, summarizeSales } from "./sales-summary";

const clientId = makeId<"ClientId">("c1") as ClientId;
const pA = makeId<"ProductId">("pa") as ProductId;
const pB = makeId<"ProductId">("pb") as ProductId;
let n = 0;
function order(managerId: string, productId: ProductId, month: string, amount: number) {
  n += 1;
  return createSalesOrder({
    id: makeId<"SalesOrderId">(`o${n}`),
    clientId,
    managerId,
    orderedAt: `${month}-15T00:00:00.000Z`,
    lines: [{ productId, quantity: 1, amount: Money.dollars(amount) }],
  });
}

describe("shiftMonth", () => {
  it("shifts across a year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-06", -12)).toBe("2025-06");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
  });
});

describe("summarizeSales", () => {
  const orders = [
    order("m1", pA, "2026-05", 1_000),
    order("m1", pB, "2026-06", 500),
    order("m2", pA, "2026-06", 2_000),
    order("m1", pA, "2025-06", 800),
  ];
  const s = summarizeSales(orders);

  it("total revenue and count", () => {
    expect(s.totalRevenueMinor).toBe(Money.dollars(4_300).amountMinor);
    expect(s.orderCount).toBe(4);
  });

  it("by manager — descending", () => {
    expect(s.byManager.map((m) => m.key)).toEqual(["m1", "m2"]);
    expect(s.byManager[0]?.revenueMinor).toBe(Money.dollars(2_300).amountMinor);
  });

  it("by product — descending", () => {
    expect(s.byProduct.map((p) => p.key)).toEqual([pA, pB]);
    expect(s.byProduct[0]?.revenueMinor).toBe(Money.dollars(3_800).amountMinor);
  });

  it("by month — chronologically", () => {
    expect(s.byMonth.map((m) => m.month)).toEqual(["2025-06", "2026-05", "2026-06"]);
    expect(s.latestMonth).toBe("2026-06");
  });

  it("period-over-period: latest/previous/a year ago", () => {
    expect(s.periodOverPeriod.latestMonthMinor).toBe(Money.dollars(2_500).amountMinor);
    expect(s.periodOverPeriod.prevMonthMinor).toBe(Money.dollars(1_000).amountMinor);
    expect(s.periodOverPeriod.prevYearMonthMinor).toBe(Money.dollars(800).amountMinor);
  });

  it("empty history → zeros and latestMonth=null", () => {
    const empty = summarizeSales([]);
    expect(empty.totalRevenueMinor).toBe(0);
    expect(empty.latestMonth).toBeNull();
  });
});
