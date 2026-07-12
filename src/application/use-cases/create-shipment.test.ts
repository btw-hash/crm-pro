import { describe, expect, it } from "vitest";
import type { Client, ClientId } from "@/domain/client/client";
import type { Product } from "@/domain/product/product";
import { ShipmentError, type ShipmentId } from "@/domain/shipment/shipment";
import { makeId } from "@/domain/shared/id";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { InMemoryShipmentRepository } from "@/infrastructure/persistence/in-memory-shipment-repository";
import { ClientNotFoundError } from "./create-deal";
import { makeCreateShipment, type CreateShipmentInput } from "./create-shipment";

const clientId = makeId<"ClientId">("c1");
const productId = makeId<"ProductId">("p1");

function client(): Client {
  return {
    id: clientId,
    name: "Amber Bakery",
    type: "ooo" as Client["type"],
    category: "a" as Client["category"],
    responsibleManagerId: "manager-owens",
    city: "Portland",
  };
}

function product(): Product {
  return { id: productId, sku: "SKU-1", name: "Belcolade", unit: "kg" };
}

function build() {
  const shipments = new InMemoryShipmentRepository([]);
  const clients = new InMemoryClientRepository([client()]);
  const products = new InMemoryProductRepository([product()]);
  return {
    shipments,
    create: makeCreateShipment({ shipments, clients, products }),
  };
}

function input(overrides: Partial<CreateShipmentInput> = {}): CreateShipmentInput {
  return {
    id: makeId<"ShipmentId">("s1") as ShipmentId,
    clientId,
    managerId: "manager-owens",
    orderNumber: "ORD-ABC123",
    lines: [{ productId, quantity: 5 }],
    scheduledDate: "2026-07-01",
    ...overrides,
  };
}

describe("createShipment", () => {
  it('creates a shipment in "placed" status and saves it', async () => {
    const { create, shipments } = build();

    const created = await create(input());

    expect(created.status).toBe("placed");
    expect(created.address).toBe("Portland");
    expect(created.lines).toEqual([
      { productName: "Belcolade", quantity: 5, unit: "kg", weightKg: 5 },
    ]);
    expect(await shipments.listByManager("manager-owens")).toHaveLength(1);
  });

  it("throws ClientNotFoundError for a nonexistent client", async () => {
    const { create } = build();
    await expect(
      create(input({ clientId: makeId<"ClientId">("missing") as ClientId })),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("rejects an empty list of line items", async () => {
    const { create } = build();
    await expect(create(input({ lines: [] }))).rejects.toBeInstanceOf(ShipmentError);
  });

  it("rejects an invalid shipment date", async () => {
    const { create } = build();
    await expect(create(input({ scheduledDate: "01.07.2026" }))).rejects.toBeInstanceOf(
      ShipmentError,
    );
  });

  it("rejects a zero quantity", async () => {
    const { create } = build();
    await expect(create(input({ lines: [{ productId, quantity: 0 }] }))).rejects.toBeInstanceOf(
      ShipmentError,
    );
  });
});
