import { describe, expect, it } from "vitest";
import type { Client, ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { createSalesOrder } from "./sales-order";
import { recommendProducts } from "./recommendation";

const cT = makeId<"ClientId">("ct") as ClientId;
const cS1 = makeId<"ClientId">("cs1") as ClientId;
const cS2 = makeId<"ClientId">("cs2") as ClientId;
const p1 = makeId<"ProductId">("p1") as ProductId;
const p2 = makeId<"ProductId">("p2") as ProductId;
const p3 = makeId<"ProductId">("p3") as ProductId;

function client(id: ClientId, category: "A" | "B" | "C"): Client {
  return { id, name: id, type: "confectioner", category, responsibleManagerId: "m1" };
}
function product(id: ProductId, margin: number): Product {
  return {
    id,
    sku: id,
    name: `Product ${id}`,
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
function order(clientId: ClientId, productId: ProductId) {
  n += 1;
  return createSalesOrder({
    id: makeId<"SalesOrderId">(`o${n}`),
    clientId,
    managerId: "m1",
    orderedAt: "2026-05-15T00:00:00.000Z",
    lines: [{ productId, quantity: 1, amount: Money.dollars(100) }],
  });
}

describe("recommendProducts", () => {
  const target = client(cT, "A");
  const clients = [target, client(cS1, "A"), client(cS2, "A")];
  const products = [product(p1, 40), product(p2, 30), product(p3, 50)];
  const orders = [
    order(cS1, p1), // similar clients buy p1
    order(cS2, p1),
    order(cT, p2), // the target already buys p2 → exclude
  ];
  const recs = recommendProducts({ targetClient: target, clients, products, orders });
  const byId = new Map(recs.map((r) => [r.productId, r]));

  it("recommends a product popular with similar clients with a high score", () => {
    expect(byId.get(p1)?.score).toBeGreaterThanOrEqual(8);
    expect(byId.get(p1)?.reason).toMatch(/2 of 2/);
  });

  it("does not recommend what the client already buys", () => {
    expect(byId.has(p2)).toBe(false);
  });

  it("a product with no buyers but with margin → included, but with a lower score", () => {
    expect(byId.has(p3)).toBe(true);
    expect(byId.get(p3)!.score).toBeLessThan(byId.get(p1)!.score);
  });

  it("sorted by score (descending)", () => {
    expect(recs.map((r) => r.productId)).toEqual([p1, p3]);
  });
});
