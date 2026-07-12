import { describe, expect, it } from "vitest";
import { makeListMyShipments } from "./list-my-shipments";
import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { Shipment } from "@/domain/shipment/shipment";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";

const c1 = makeId<"ClientId">("c1") as ClientId;
const c2 = makeId<"ClientId">("c2") as ClientId;

function makeShipment(over: Partial<Shipment> & Pick<Shipment, "id" | "managerId">): Shipment {
  return {
    clientId: c1,
    orderNumber: "ORD-1",
    address: "Portland",
    lines: [{ productName: "Belcolade", quantity: 100, unit: "kg", weightKg: 100 }],
    driver: "Truck 1",
    scheduledDate: "2026-06-25",
    status: "placed",
    dealId: null,
    ...over,
  };
}

const shp1 = makeShipment({ id: makeId<"ShipmentId">("s1"), managerId: "mop-a" });
const shp2 = makeShipment({
  id: makeId<"ShipmentId">("s2"),
  managerId: "mop-a",
  clientId: c2,
  scheduledDate: "2026-06-24",
  status: "in_accounting",
});
const shp3 = makeShipment({ id: makeId<"ShipmentId">("s3"), managerId: "mop-b" });

const stubShipments: ShipmentRepository = {
  save: async () => {},
  findById: async () => null,
  findByDealId: async () => null,
  list: async () => [shp1, shp2, shp3],
  listByManager: async (managerId: string) =>
    [shp1, shp2, shp3].filter((s) => s.managerId === managerId),
  listByStatus: async (status: string) => [shp1, shp2, shp3].filter((s) => s.status === status),
};

const stubClients: Pick<ClientRepository, "list"> = {
  list: async () => [
    {
      id: "c1",
      name: "Union Grocery Wholesale",
      ein: "12-3456789",
      kpp: null,
      address: "",
      phone: null,
      email: null,
      responsibleManagerId: "mop-a",
      creditLimit: null,
      status: "A",
    },
    {
      id: "c2",
      name: "Sweet Tooth Confections",
      ein: null,
      kpp: null,
      address: "",
      phone: null,
      email: null,
      responsibleManagerId: "mop-a",
      creditLimit: null,
      status: "B",
    },
  ],
} as unknown as ClientRepository;

describe("listMyShipments (owner-scoped view for a sales manager)", () => {
  it("returns only shipments for the given manager", async () => {
    const listMyShipments = makeListMyShipments({
      shipments: stubShipments,
      clients: stubClients as ClientRepository,
    });
    const rows = await listMyShipments({ managerId: "mop-a" });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.shipmentId !== String(shp3.id))).toBe(true);
  });

  it("sorts by shipment date ascending", async () => {
    const listMyShipments = makeListMyShipments({
      shipments: stubShipments,
      clients: stubClients as ClientRepository,
    });
    const rows = await listMyShipments({ managerId: "mop-a" });
    expect(rows[0]?.scheduledDate).toBe("2026-06-24");
    expect(rows[1]?.scheduledDate).toBe("2026-06-25");
  });

  it("fills in the client name and status label", async () => {
    const listMyShipments = makeListMyShipments({
      shipments: stubShipments,
      clients: stubClients as ClientRepository,
    });
    const rows = await listMyShipments({ managerId: "mop-a" });
    const inAcc = rows.find((r) => r.status === "in_accounting");
    expect(inAcc?.clientName).toBe("Sweet Tooth Confections");
    expect(inAcc?.statusLabel).toBe("In accounting");
  });

  it("returns an empty list for a manager with no shipments", async () => {
    const listMyShipments = makeListMyShipments({
      shipments: stubShipments,
      clients: stubClients as ClientRepository,
    });
    const rows = await listMyShipments({ managerId: "unknown-mop" });
    expect(rows).toHaveLength(0);
  });
});
