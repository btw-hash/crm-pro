import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import type { Shipment } from "./shipment";
import { buildShipmentSummary } from "./summary";

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

const NAMES: Record<string, string> = { c1: "Bulk Pantry Co.", c2: "Sweet Tooth Bakery" };
const name = (id: string) => NAMES[id] ?? id;

describe("buildShipmentSummary (daily shipment summary report)", () => {
  it("returns an empty report for an empty shipment list", () => {
    expect(buildShipmentSummary([], name)).toEqual([]);
  });

  it("groups shipments by date and computes the day's totals", () => {
    const days = buildShipmentSummary(
      [
        shipment({
          id: makeId<"ShipmentId">("s1"),
          clientId: c1,
          scheduledDate: "2026-06-25",
          driver: "Truck 1",
          lines: [{ productName: "A", quantity: 1, unit: "kg", weightKg: 200 }],
        }),
        shipment({
          id: makeId<"ShipmentId">("s2"),
          clientId: c2,
          scheduledDate: "2026-06-25",
          driver: "Truck 1",
          lines: [{ productName: "B", quantity: 1, unit: "kg", weightKg: 300 }],
        }),
      ],
      name,
    );

    expect(days).toHaveLength(1);
    const day = days[0];
    expect(day?.date).toBe("2026-06-25");
    expect(day?.shipmentCount).toBe(2);
    expect(day?.totalWeightKg).toBe(500);
    expect(day?.driverCount).toBe(1); // one truck for both runs
    expect(day?.clientCount).toBe(2);
  });

  it("sorts days by date, rows within a day — by client", () => {
    const days = buildShipmentSummary(
      [
        shipment({ id: makeId<"ShipmentId">("s1"), clientId: c2, scheduledDate: "2026-06-27" }),
        shipment({ id: makeId<"ShipmentId">("s2"), clientId: c2, scheduledDate: "2026-06-25" }),
        shipment({ id: makeId<"ShipmentId">("s3"), clientId: c1, scheduledDate: "2026-06-25" }),
      ],
      name,
    );

    expect(days.map((d) => d.date)).toEqual(["2026-06-25", "2026-06-27"]);
    // within 2026-06-25 — Bulk Pantry Co. (c1) comes before Sweet Tooth Bakery (c2)
    expect(days[0]?.rows.map((r) => r.clientName)).toEqual([
      "Bulk Pantry Co.",
      "Sweet Tooth Bakery",
    ]);
  });

  it("includes delivered shipments (this is a fact-report for the day, not a delivery plan)", () => {
    const days = buildShipmentSummary(
      [
        shipment({
          id: makeId<"ShipmentId">("s1"),
          clientId: c1,
          scheduledDate: "2026-06-23",
          status: "delivered",
        }),
      ],
      name,
    );

    expect(days).toHaveLength(1);
    expect(days[0]?.rows[0]?.status).toBe("delivered");
    expect(days[0]?.deliveredCount).toBe(1);
  });

  it("counts an unassigned driver as a separate label and excludes it from driverCount", () => {
    const days = buildShipmentSummary(
      [
        shipment({
          id: makeId<"ShipmentId">("s1"),
          clientId: c1,
          scheduledDate: "2026-06-25",
          driver: "Truck 1",
        }),
        shipment({
          id: makeId<"ShipmentId">("s2"),
          clientId: c2,
          scheduledDate: "2026-06-25",
          driver: null,
        }),
      ],
      name,
    );

    expect(days[0]?.driverCount).toBe(1); // only the actually assigned truck
    expect(days[0]?.unassignedCount).toBe(1);
    const unassignedRow = days[0]?.rows.find((r) => r.clientName === "Sweet Tooth Bakery");
    expect(unassignedRow?.driver).toBe("— unassigned —");
  });
});
