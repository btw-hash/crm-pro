import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { createPurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import { createSalesOrder } from "@/domain/sales/sales-order";
import { makeId } from "@/domain/shared/id";
import { analyzeProcurement } from "./procurement-analysis";

const A = makeId<"ProductId">("a") as ProductId; // shortage
const B = makeId<"ProductId">("b") as ProductId; // overstock
const C = makeId<"ProductId">("c") as ProductId; // normal
const D = makeId<"ProductId">("d") as ProductId; // dead stock
const c1 = makeId<"ClientId">("c1") as ClientId;

function product(id: ProductId): Product {
  return {
    id,
    sku: id,
    name: `Product ${id}`,
    unit: "kg",
    kit: {
      category: "X",
      benefits: [],
      marginPercent: 30,
      shelfLife: "12 months",
      rsp: Money.dollars(100),
    },
  };
}

let n = 0;
function sale(productId: ProductId, month: string, qty: number) {
  n += 1;
  return createSalesOrder({
    id: makeId<"SalesOrderId">(`s${n}`),
    clientId: c1,
    managerId: "m1",
    orderedAt: `${month}-15T00:00:00.000Z`,
    lines: [{ productId, quantity: qty, amount: Money.dollars(qty * 100) }],
  });
}
function purchase(productId: ProductId, month: string, qty: number) {
  n += 1;
  return createPurchaseReceipt({
    id: makeId<"PurchaseReceiptId">(`p${n}`),
    supplierName: "Supplier",
    receivedAt: `${month}-05T00:00:00.000Z`,
    lines: [{ productId, quantity: qty, amount: Money.dollars(qty * 60) }],
  });
}

const products = [product(A), product(B), product(C), product(D)];
const months = ["2026-04", "2026-05", "2026-06"];
const sales = [
  ...months.map((m) => sale(A, m, 100)), // 300 over 3 months → 100/month
  ...months.map((m) => sale(B, m, 10)), // 30 → 10/month
  ...months.map((m) => sale(C, m, 30)), // 90 → 30/month
  // D — no sales
];
const purchases = [purchase(A, "2026-05", 80), purchase(B, "2026-05", 200)];
const stockUnits = new Map<string, number>([
  [A, 50], // 0.5 months of stock → shortage
  [B, 100], // 10 months → overstock
  [C, 50], // 1.67 months → normal
  [D, 20], // no sales, but sitting in stock → overstock
]);

describe("analyzeProcurement", () => {
  const rows = analyzeProcurement({ sales, purchases, stockUnits, products });
  const byId = new Map(rows.map((r) => [r.productId, r]));

  it("shortage: fast depletion + low stock → buy more, with a recommended volume", () => {
    const a = byId.get(A);
    expect(a?.signal).toBe("shortage");
    expect(a?.monthsOfStock).toBeCloseTo(0.5);
    expect(a?.recommendedBuyUnits).toBe(150); // up to 2 months: 2*100 - 50
  });

  it("overstock: many months of stock → reduce purchasing", () => {
    expect(byId.get(B)?.signal).toBe("overstock");
  });

  it("normal: stock between thresholds → hold", () => {
    expect(byId.get(C)?.signal).toBe("ok");
  });

  it("dead stock (no sales, balance present) → overstock, months of stock = null", () => {
    expect(byId.get(D)?.signal).toBe("overstock");
    expect(byId.get(D)?.monthsOfStock).toBeNull();
  });

  it("sorting: items needing action (shortage/overstock) rank above 'hold'", () => {
    expect(rows[rows.length - 1]?.signal).toBe("ok"); // C — at the bottom
    expect(rows[0]?.signal).toBe("shortage"); // A — at the top
  });
});
