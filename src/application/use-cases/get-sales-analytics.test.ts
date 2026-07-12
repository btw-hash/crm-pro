import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { createSalesOrder } from "@/domain/sales/sales-order";
import { makeId } from "@/domain/shared/id";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { makeGetSalesAnalytics } from "./get-sales-analytics";

const m1 = "manager-1";
const m2 = "manager-2";
const c1 = makeId<"ClientId">("c1") as ClientId;
const p1 = makeId<"ProductId">("p1") as ProductId;
const product: Product = { id: p1, sku: "SKU1", name: "Product", unit: "kg" };

function order(id: string, managerId: string, amount: number) {
  return createSalesOrder({
    id: makeId<"SalesOrderId">(id),
    clientId: c1,
    managerId,
    orderedAt: "2026-05-15T00:00:00.000Z",
    lines: [{ productId: p1, quantity: 1, amount: Money.dollars(amount) }],
  });
}

function build() {
  const erp = new StubErpGateway([], [], [], [order("o1", m1, 100_000), order("o2", m2, 60_000)]);
  const products = new InMemoryProductRepository([product]);
  return makeGetSalesAnalytics({ erp, products, labelManager: (id) => id });
}

describe("getSalesAnalytics scope", () => {
  it("without scope - the whole department (both managers in byManager)", async () => {
    const view = await build()();
    expect(view.orderCount).toBe(2);
    expect(view.byManager).toHaveLength(2);
  });

  it("scope.managerId - only their own slice (one manager, someone else's revenue is not visible)", async () => {
    const view = await build()({ managerId: m1 });
    expect(view.orderCount).toBe(1);
    expect(view.byManager).toHaveLength(1);
    expect(view.byManager[0]?.label).toBe(m1);
    expect(view.totalRevenue).toBe(Money.dollars(100_000).format());
  });
});
