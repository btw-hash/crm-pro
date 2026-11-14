import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import type { ClientId } from "@/domain/client/client";
import { ShipmentError, type Shipment, type ShipmentStatus } from "@/domain/shipment/shipment";
import { InMemoryShipmentRepository } from "@/infrastructure/persistence/in-memory-shipment-repository";
import { seedShipments } from "@/infrastructure/persistence/seed/operations";
import { heads } from "@/infrastructure/persistence/seed/refs";
import { makeCancelMyShipment } from "./cancel-my-shipment";

function shipment(status: ShipmentStatus, managerId = "manager-owens"): Shipment {
  return {
    id: makeId<"ShipmentId">("s1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    managerId,
    orderNumber: "ORD-2026-0001",
    address: "123 Oak St, Portland",
    lines: [{ productName: "Noirelle", quantity: 2, unit: "bag", weightKg: 50 }],
    driver: null,
    scheduledDate: "2026-06-25",
    status,
    dealId: null,
  };
}

describe("makeCancelMyShipment", () => {
  it("cancels its own undelivered shipment and saves it", async () => {
    const repo = new InMemoryShipmentRepository([shipment("in_warehouse")]);
    const cancel = makeCancelMyShipment({ shipments: repo });
    const result = await cancel({ id: makeId<"ShipmentId">("s1"), managerId: "manager-owens" });
    expect(result.status).toBe("cancelled");
    const saved = await repo.findById(makeId<"ShipmentId">("s1"));
    expect(saved?.status).toBe("cancelled");
  });

  it("cannot cancel someone else's shipment", async () => {
    const repo = new InMemoryShipmentRepository([shipment("placed", "manager-owens")]);
    const cancel = makeCancelMyShipment({ shipments: repo });
    await expect(
      cancel({ id: makeId<"ShipmentId">("s1"), managerId: "manager-grant" }),
    ).rejects.toThrow(ShipmentError);
  });

  it("nonexistent — error", async () => {
    const repo = new InMemoryShipmentRepository([]);
    const cancel = makeCancelMyShipment({ shipments: repo });
    await expect(
      cancel({ id: makeId<"ShipmentId">("nope"), managerId: "manager-owens" }),
    ).rejects.toThrow(ShipmentError);
  });

  it("delivered — error", async () => {
    const repo = new InMemoryShipmentRepository([shipment("delivered")]);
    const cancel = makeCancelMyShipment({ shipments: repo });
    await expect(
      cancel({ id: makeId<"ShipmentId">("s1"), managerId: "manager-owens" }),
    ).rejects.toThrow(ShipmentError);
  });

  // Integration on the real seed: the owner cancels their own active shipment.
  it("on the real seedShipments: the head of sales cancels their own active order", async () => {
    const repo = new InMemoryShipmentRepository(seedShipments);
    const cancel = makeCancelMyShipment({ shipments: repo });
    // shp-7 - placed, owned by heads.alexander.
    const result = await cancel({
      id: makeId<"ShipmentId">("shp-7"),
      managerId: heads.alexander,
    });
    expect(result.status).toBe("cancelled");
    const saved = await repo.findById(makeId<"ShipmentId">("shp-7"));
    expect(saved?.status).toBe("cancelled");
  });
});
