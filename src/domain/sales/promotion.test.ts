import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import type { AssortmentRow } from "./assortment";
import { createSalesOrder } from "./sales-order";
import { collectSellersByProduct, suggestPromotions } from "./promotion";
import { makeId } from "@/domain/shared/id";

function row(productId: string, trend: AssortmentRow["trend"]): AssortmentRow {
  return {
    productId,
    productName: `Product ${productId}`,
    category: "X",
    revenueLast3Minor: 0,
    unitsLast3: 0,
    marginPercent: 30,
    grossMarginLast3Minor: 0,
    monthsSinceLastSale: trend === "dead" ? 4 : 1,
    trend,
    valueRank: 1,
  };
}

describe("collectSellersByProduct", () => {
  it("collects the managers who sold each product", () => {
    const order = (mgr: string, pid: string) =>
      createSalesOrder({
        id: makeId<"SalesOrderId">(`${mgr}-${pid}`),
        clientId: makeId<"ClientId">("c1") as ClientId,
        managerId: mgr,
        orderedAt: "2026-06-01T00:00:00.000Z",
        lines: [
          {
            productId: makeId<"ProductId">(pid) as ProductId,
            quantity: 1,
            amount: Money.dollars(100),
          },
        ],
      });
    const map = collectSellersByProduct([
      order("kent", "p1"),
      order("grant", "p1"),
      order("kent", "p2"),
    ]);
    expect(map.get("p1")).toEqual(["grant", "kent"]);
    expect(map.get("p2")).toEqual(["kent"]);
  });
});

describe("suggestPromotions", () => {
  const rows = [
    row("dead-stock", "dead"),
    row("declining-stock", "declining"),
    row("growth", "growth"),
    row("dead-nostock", "dead"),
  ];
  const stock = new Map<string, number>([
    ["dead-stock", 800],
    ["declining-stock", 120],
    ["growth", 50],
    ["dead-nostock", 0],
  ]);
  const sellers = new Map<string, readonly string[]>([["dead-stock", ["kent"]]]);
  const result = suggestPromotions({ rows, stockUnits: stock, sellersByProduct: sellers });

  it("only takes dead/declining WITH stock (not growth, not zero stock)", () => {
    expect(result.map((c) => c.productId)).toEqual(["dead-stock", "declining-stock"]);
  });

  it("action: dead → liquidate, declining → stimulate", () => {
    expect(result.find((c) => c.productId === "dead-stock")?.action).toBe("liquidate");
    expect(result.find((c) => c.productId === "declining-stock")?.action).toBe("stimulate");
  });

  it("sorted by stock (more frozen stock — on top) + sellers for outreach", () => {
    expect(result[0]?.productId).toBe("dead-stock"); // 800 > 120
    expect(result[0]?.sellers).toEqual(["kent"]);
  });
});
