import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import {
  type AccountingClient,
  buildAccountingHandoff,
  DEFAULT_ACCOUNTING_DOCS,
} from "./accounting";
import type { Shipment } from "./shipment";

const c1 = makeId<"ClientId">("c1") as ClientId;
const c2 = makeId<"ClientId">("c2") as ClientId;

function shipment(over: Partial<Shipment> & Pick<Shipment, "id" | "clientId">): Shipment {
  return {
    managerId: "mop-test",
    orderNumber: "ORD-1",
    address: "Portland",
    lines: [{ productName: "Noirelle", quantity: 100, unit: "kg", weightKg: 100 }],
    driver: "Truck 1 (Smith)",
    scheduledDate: "2026-06-25",
    status: "placed",
    dealId: null,
    ...over,
  };
}

const INFO: Record<string, AccountingClient> = {
  c1: { name: "Bulk Pantry Co.", ein: "39-0012345" },
  c2: { name: "Sweet Tooth Bakery", ein: null },
};
const client = (id: string): AccountingClient => INFO[id] ?? { name: id, ein: null };

describe("buildAccountingHandoff (order → accounting handoff memo)", () => {
  it("returns an empty package for an empty list", () => {
    expect(buildAccountingHandoff([], client)).toEqual({
      rows: [],
      orderCount: 0,
      totalWeightKg: 0,
    });
  });

  it('only takes orders at the "Placed"/"In accounting" stages (before handoff to the warehouse)', () => {
    const handoff = buildAccountingHandoff(
      [
        shipment({ id: makeId<"ShipmentId">("s1"), clientId: c1, status: "placed" }),
        shipment({ id: makeId<"ShipmentId">("s2"), clientId: c1, status: "in_accounting" }),
        shipment({ id: makeId<"ShipmentId">("s3"), clientId: c1, status: "in_warehouse" }),
        shipment({ id: makeId<"ShipmentId">("s4"), clientId: c1, status: "loading" }),
        shipment({ id: makeId<"ShipmentId">("s5"), clientId: c1, status: "delivered" }),
      ],
      client,
    );

    expect(handoff.rows.map((r) => r.shipmentId)).toEqual(["s1", "s2"]);
    expect(handoff.orderCount).toBe(2);
  });

  it("fills in client details (tax ID) and the standard document package", () => {
    const handoff = buildAccountingHandoff(
      [
        shipment({
          id: makeId<"ShipmentId">("s1"),
          clientId: c1,
          orderNumber: "ORD-100",
          lines: [{ productName: "Cocoa", quantity: 2, unit: "bag", weightKg: 50 }],
        }),
      ],
      client,
    );

    const row = handoff.rows[0];
    expect(row?.clientName).toBe("Bulk Pantry Co.");
    expect(row?.ein).toBe("39-0012345");
    expect(row?.orderNumber).toBe("ORD-100");
    expect(row?.products).toBe("Cocoa — 2 bag");
    expect(row?.totalWeightKg).toBe(50);
    expect(row?.documents).toEqual(DEFAULT_ACCOUNTING_DOCS);
  });

  it("keeps a null tax ID when the client doesn't have one on file", () => {
    const handoff = buildAccountingHandoff(
      [shipment({ id: makeId<"ShipmentId">("s1"), clientId: c2, status: "in_accounting" })],
      client,
    );
    expect(handoff.rows[0]?.ein).toBeNull();
  });

  it("sorts by shipment date, then by order number; sums the package weight", () => {
    const handoff = buildAccountingHandoff(
      [
        shipment({
          id: makeId<"ShipmentId">("s1"),
          clientId: c1,
          orderNumber: "ORD-2",
          scheduledDate: "2026-06-27",
          lines: [{ productName: "A", quantity: 1, unit: "kg", weightKg: 300 }],
        }),
        shipment({
          id: makeId<"ShipmentId">("s2"),
          clientId: c1,
          orderNumber: "ORD-9",
          scheduledDate: "2026-06-25",
          lines: [{ productName: "B", quantity: 1, unit: "kg", weightKg: 100 }],
        }),
        shipment({
          id: makeId<"ShipmentId">("s3"),
          clientId: c1,
          orderNumber: "ORD-1",
          scheduledDate: "2026-06-25",
          lines: [{ productName: "C", quantity: 1, unit: "kg", weightKg: 200 }],
        }),
      ],
      client,
    );

    expect(handoff.rows.map((r) => r.orderNumber)).toEqual(["ORD-1", "ORD-9", "ORD-2"]);
    expect(handoff.totalWeightKg).toBe(600);
  });
});
