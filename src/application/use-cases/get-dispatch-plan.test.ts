import { describe, expect, it } from "vitest";
import type { Client, ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import type { Shipment } from "@/domain/shipment/shipment";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryShipmentRepository } from "@/infrastructure/persistence/in-memory-shipment-repository";
import { makeGetDispatchPlan } from "./get-dispatch-plan";

function client(id: string, name: string): Client {
  return {
    id: makeId<"ClientId">(id) as ClientId,
    name,
    type: "horeca",
    category: "B",
    responsibleManagerId: "m1",
  };
}

function shipment(over: Partial<Shipment> & Pick<Shipment, "id" | "clientId">): Shipment {
  return {
    managerId: "mop-test",
    orderNumber: "SO-1",
    address: "Denver",
    lines: [{ productName: "Noirelle", quantity: 100, unit: "kg", weightKg: 100 }],
    driver: "Truck 1",
    scheduledDate: "2026-06-25",
    status: "placed",
    dealId: null,
    ...over,
  };
}

describe("getDispatchPlan", () => {
  it("assembles the note, summary report, and schedule — substituting client names", async () => {
    const clients = new InMemoryClientRepository([
      client("c1", "Union Grocery Wholesale Co."),
      client("c2", "Sweet Tooth Bakery"),
    ]);
    const shipments = new InMemoryShipmentRepository([
      shipment({
        id: makeId<"ShipmentId">("s1"),
        clientId: makeId<"ClientId">("c1") as ClientId,
        scheduledDate: "2026-06-25",
        lines: [{ productName: "A", quantity: 1, unit: "kg", weightKg: 200 }],
      }),
      shipment({
        id: makeId<"ShipmentId">("s2"),
        clientId: makeId<"ClientId">("c2") as ClientId,
        scheduledDate: "2026-06-25",
        lines: [{ productName: "B", quantity: 1, unit: "kg", weightKg: 300 }],
      }),
    ]);
    const getDispatchPlan = makeGetDispatchPlan({ shipments, clients });

    const plan = await getDispatchPlan();

    expect(plan.note).toHaveLength(2);
    expect(plan.schedule).toHaveLength(1);
    expect(plan.summary).toHaveLength(1); // both shipments on the same day
    const day = plan.summary[0];
    expect(day?.date).toBe("2026-06-25");
    expect(day?.totalWeightKg).toBe(500);
    expect(day?.shipmentCount).toBe(2);
    expect(day?.rows.map((r) => r.clientName)).toEqual([
      "Sweet Tooth Bakery",
      "Union Grocery Wholesale Co.",
    ]);
  });

  it("no shipments → empty documents", async () => {
    const getDispatchPlan = makeGetDispatchPlan({
      shipments: new InMemoryShipmentRepository([]),
      clients: new InMemoryClientRepository([]),
    });

    const plan = await getDispatchPlan();

    expect(plan.note).toEqual([]);
    expect(plan.summary).toEqual([]);
    expect(plan.schedule).toEqual([]);
  });
});
