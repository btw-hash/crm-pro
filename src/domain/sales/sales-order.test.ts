import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import {
  createSalesOrder,
  salesOrderTotal,
  SalesOrderValidationError,
  type SalesOrderLine,
} from "./sales-order";

const clientId = makeId<"ClientId">("c1") as ClientId;
const p1 = makeId<"ProductId">("p1") as ProductId;
const p2 = makeId<"ProductId">("p2") as ProductId;
const lines: SalesOrderLine[] = [
  { productId: p1, quantity: 2, amount: Money.dollars(100) },
  { productId: p2, quantity: 1, amount: Money.dollars(50) },
];

describe("salesOrderTotal", () => {
  it("total = sum of the lines", () => {
    expect(salesOrderTotal(lines).amountMinor).toBe(15000); // $150
  });
  it("empty list → 0", () => {
    expect(salesOrderTotal([]).amountMinor).toBe(0);
  });
});

describe("createSalesOrder", () => {
  const base = {
    id: makeId<"SalesOrderId">("so1"),
    clientId,
    managerId: "m1",
    orderedAt: "2026-01-15T00:00:00.000Z",
  };

  it("computes the total and assembles the order", () => {
    const order = createSalesOrder({ ...base, lines });
    expect(order.total.amountMinor).toBe(15000);
    expect(order.lines).toHaveLength(2);
    expect(order.managerId).toBe("m1");
  });

  it("empty lines → error", () => {
    expect(() => createSalesOrder({ ...base, lines: [] })).toThrow(SalesOrderValidationError);
  });

  it("quantity ≤ 0 → error", () => {
    expect(() =>
      createSalesOrder({
        ...base,
        lines: [{ productId: p1, quantity: 0, amount: Money.dollars(10) }],
      }),
    ).toThrow(SalesOrderValidationError);
  });
});
