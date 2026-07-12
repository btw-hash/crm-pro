import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import { buildDeliverySchedule, buildDispatchNote } from "./dispatch";
import {
  advanceShipment,
  advanceShipmentFromStage,
  type Shipment,
  ShipmentError,
  shipmentTotalWeightKg,
} from "./shipment";

const c1 = makeId<"ClientId">("c1") as ClientId;
const c2 = makeId<"ClientId">("c2") as ClientId;

function shipment(over: Partial<Shipment> & Pick<Shipment, "id" | "clientId">): Shipment {
  return {
    managerId: "mop-test",
    orderNumber: "ORD-1",
    address: "Portland",
    lines: [{ productName: "Belcolade", quantity: 100, unit: "kg", weightKg: 100 }],
    driver: "Truck 1 (Smith)",
    scheduledDate: "2026-06-25",
    status: "placed",
    dealId: null,
    ...over,
  };
}

const NAMES: Record<string, string> = { c1: "Bulk Pantry Co.", c2: "Sweet Tooth Bakery" };
const name = (id: string) => NAMES[id] ?? id;

describe("shipment weights and transitions", () => {
  it("sums the weight across line items", () => {
    const s = shipment({
      id: makeId<"ShipmentId">("s1"),
      clientId: c1,
      lines: [
        { productName: "A", quantity: 1, unit: "kg", weightKg: 200 },
        { productName: "B", quantity: 1, unit: "kg", weightKg: 500 },
      ],
    });
    expect(shipmentTotalWeightKg(s)).toBe(700);
  });

  it('goes through the flow up to "Delivered", no further', () => {
    let s = shipment({ id: makeId<"ShipmentId">("s1"), clientId: c1 });
    s = advanceShipment(s); // in_accounting
    s = advanceShipment(s); // in_warehouse
    s = advanceShipment(s); // loading
    s = advanceShipment(s); // delivered
    expect(s.status).toBe("delivered");
    expect(() => advanceShipment(s)).toThrow(ShipmentError);
  });
});

describe("advanceShipmentFromStage (stage-gated advance for operational roles)", () => {
  it("advances from the allowed stage to the next one", () => {
    const s = shipment({ id: makeId<"ShipmentId">("s1"), clientId: c1, status: "loading" });
    const next = advanceShipmentFromStage(s, "loading");
    expect(next.status).toBe("delivered");
  });

  it("throws ShipmentError if the current stage doesn't match the allowed one", () => {
    const s = shipment({ id: makeId<"ShipmentId">("s1"), clientId: c1, status: "placed" });
    expect(() => advanceShipmentFromStage(s, "loading")).toThrow(ShipmentError);
  });

  it("throws ShipmentError for an accountant on someone else's stage", () => {
    const s = shipment({ id: makeId<"ShipmentId">("s1"), clientId: c1, status: "in_warehouse" });
    expect(() => advanceShipmentFromStage(s, "in_accounting")).toThrow(ShipmentError);
  });
});

describe("buildDispatchNote (warehouse note)", () => {
  it("assembles client/address/products/weight/driver rows, by date", () => {
    const rows = buildDispatchNote(
      [
        shipment({
          id: makeId<"ShipmentId">("s2"),
          clientId: c2,
          scheduledDate: "2026-06-26",
          address: "456 Pine St, Portland, OR",
        }),
        shipment({ id: makeId<"ShipmentId">("s1"), clientId: c1, scheduledDate: "2026-06-25" }),
      ],
      name,
    );
    expect(rows.map((r) => r.clientName)).toEqual(["Bulk Pantry Co.", "Sweet Tooth Bakery"]); // by date
    expect(rows[0]?.totalWeightKg).toBe(100);
    expect(rows[0]?.products).toContain("Belcolade — 100 kg");
  });
});

describe("buildDeliverySchedule (delivery schedule)", () => {
  it("groups NOT-yet-delivered shipments by driver and date, sums weight", () => {
    const routes = buildDeliverySchedule(
      [
        shipment({
          id: makeId<"ShipmentId">("s1"),
          clientId: c1,
          driver: "Truck 1",
          lines: [{ productName: "A", quantity: 1, unit: "kg", weightKg: 300 }],
        }),
        shipment({
          id: makeId<"ShipmentId">("s2"),
          clientId: c2,
          driver: "Truck 1",
          lines: [{ productName: "B", quantity: 1, unit: "kg", weightKg: 200 }],
        }),
        shipment({
          id: makeId<"ShipmentId">("s3"),
          clientId: c1,
          driver: "Truck 2",
          status: "delivered", // delivered shipments don't appear in the schedule
        }),
      ],
      name,
    );
    expect(routes).toHaveLength(1); // one truck-date (the delivered one is dropped)
    expect(routes[0]?.driver).toBe("Truck 1");
    expect(routes[0]?.stops).toHaveLength(2);
    expect(routes[0]?.totalWeightKg).toBe(500);
  });
});
