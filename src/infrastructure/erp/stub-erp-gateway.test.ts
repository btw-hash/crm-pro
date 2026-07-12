import { describe, expect, it } from "vitest";
import { ErpWriteError } from "@/application/ports/erp-gateway";
import type { ClientId } from "@/domain/client/client";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { seedSalesOrders } from "@/infrastructure/persistence/seed";
import { StubErpGateway } from "./stub-erp-gateway";

describe("StubErpGateway.getSalesHistory", () => {
  const erp = new StubErpGateway([], [], [], seedSalesOrders);

  it("returns full history without a filter", async () => {
    const all = await erp.getSalesHistory();
    expect(all.length).toBe(seedSalesOrders.length);
    expect(all.length).toBeGreaterThan(0);
  });

  it("filters by client returns only that client's orders", async () => {
    const all = await erp.getSalesHistory();
    const first = all[0];
    if (!first) throw new Error("seed history is empty");
    const filtered = await erp.getSalesHistory({ clientId: first.clientId });
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((order) => order.clientId === first.clientId)).toBe(true);
  });

  it("unknown client → empty history", async () => {
    const filtered = await erp.getSalesHistory({
      clientId: makeId<"ClientId">("client-ghost") as ClientId,
    });
    expect(filtered).toHaveLength(0);
  });
});

describe("StubErpGateway.createCustomerOrder", () => {
  const clientId = makeId<"ClientId">("c1") as ClientId;
  const productId = makeId<"ProductId">("p1") as ProductId;
  const draft = {
    clientId,
    lines: [{ productId, quantity: 100 }],
    shipmentDate: "2026-07-01",
    idempotencyKey: "order:deal-1",
  };

  it("creates an order with a number and idempotent=false flag", async () => {
    const erp = new StubErpGateway([], [], []);
    const result = await erp.createCustomerOrder(draft);
    expect(result.orderNumber).toMatch(/^STUB-/);
    expect(result.idempotent).toBe(false);
  });

  it("repeat with the same key → same number, idempotent=true, no duplicate", async () => {
    const erp = new StubErpGateway([], [], []);
    const first = await erp.createCustomerOrder(draft);
    const second = await erp.createCustomerOrder(draft);
    expect(second.orderNumber).toBe(first.orderNumber);
    expect(second.idempotent).toBe(true);
  });

  it("different keys → different orders", async () => {
    const erp = new StubErpGateway([], [], []);
    const a = await erp.createCustomerOrder(draft);
    const b = await erp.createCustomerOrder({ ...draft, idempotencyKey: "order:deal-2" });
    expect(b.orderNumber).not.toBe(a.orderNumber);
  });

  it("no shipment date → ErpWriteError(missing_required_field)", async () => {
    const erp = new StubErpGateway([], [], []);
    await expect(erp.createCustomerOrder({ ...draft, shipmentDate: "" })).rejects.toMatchObject({
      name: "ErpWriteError",
      reason: "missing_required_field",
    });
    await expect(erp.createCustomerOrder({ ...draft, shipmentDate: "" })).rejects.toBeInstanceOf(
      ErpWriteError,
    );
  });
});
