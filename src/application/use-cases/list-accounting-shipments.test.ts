import { describe, expect, it } from "vitest";
import {
  makeListAccountingShipments,
  makeAdvanceAccountingShipment,
} from "./list-accounting-shipments";
import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { Shipment } from "@/domain/shipment/shipment";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";

const c1 = makeId<"ClientId">("c1") as ClientId;

function makeShipment(over: Partial<Shipment> & Pick<Shipment, "id">): Shipment {
  return {
    clientId: c1,
    managerId: "mop-a",
    orderNumber: "ORD-1",
    address: "Portland",
    lines: [{ productName: "Noirelle", quantity: 100, unit: "kg", weightKg: 100 }],
    driver: "Truck 1",
    scheduledDate: "2026-06-25",
    status: "in_accounting",
    dealId: null,
    ...over,
  };
}

const inAcc1 = makeShipment({
  id: makeId<"ShipmentId">("s1"),
  scheduledDate: "2026-06-25",
});
const inAcc2 = makeShipment({
  id: makeId<"ShipmentId">("s2"),
  scheduledDate: "2026-06-24",
});
const placed = makeShipment({ id: makeId<"ShipmentId">("s3"), status: "placed" });

function makeRepo(initial: Shipment[]): ShipmentRepository & { saved: Shipment[] } {
  const store = [...initial];
  const saved: Shipment[] = [];
  return {
    saved,
    save: async (s: Shipment) => {
      saved.push(s);
      const i = store.findIndex((x) => x.id === s.id);
      if (i >= 0) store[i] = s;
      else store.push(s);
    },
    findById: async (id) => store.find((s) => s.id === id) ?? null,
    findByDealId: async (dealId) => store.find((s) => s.dealId === dealId) ?? null,
    list: async () => store,
    listByManager: async (m) => store.filter((s) => s.managerId === m),
    listByStatus: async (status: string) => store.filter((s) => s.status === status),
  };
}

const stubClients = {
  list: async () => [
    {
      id: "c1",
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

describe("listAccountingShipments (accounting queue)", () => {
  it("returns only orders at the in_accounting stage", async () => {
    const list = makeListAccountingShipments({
      shipments: makeRepo([inAcc1, inAcc2, placed]),
      clients: stubClients,
    });
    const rows = await list();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.shipmentId !== String(placed.id))).toBe(true);
  });

  it("sorts by date ascending and fills in client name + status label", async () => {
    const list = makeListAccountingShipments({
      shipments: makeRepo([inAcc1, inAcc2]),
      clients: stubClients,
    });
    const rows = await list();
    expect(rows[0]?.scheduledDate).toBe("2026-06-24");
    expect(rows[0]?.clientName).toBe("Sweet Tooth Confections");
    expect(rows[0]?.statusLabel).toBe("In accounting");
  });

  it("returns an empty list when no orders are at the accounting stage", async () => {
    const list = makeListAccountingShipments({
      shipments: makeRepo([placed]),
      clients: stubClients,
    });
    expect(await list()).toHaveLength(0);
  });
});

describe("advanceAccountingShipment (in_accounting → in_warehouse)", () => {
  it("moves the order to the warehouse", async () => {
    const repo = makeRepo([inAcc1]);
    const advance = makeAdvanceAccountingShipment({ shipments: repo });
    await advance({ id: inAcc1.id });
    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0]?.status).toBe("in_warehouse");
  });

  it("throws if the order is not found", async () => {
    const advance = makeAdvanceAccountingShipment({ shipments: makeRepo([]) });
    await expect(advance({ id: makeId<"ShipmentId">("missing") })).rejects.toThrow();
  });
});
