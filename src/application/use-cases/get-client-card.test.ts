import { describe, expect, it } from "vitest";
import type { Client, ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import type { Viewer } from "@/domain/shared/viewer";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryContactRepository } from "@/infrastructure/persistence/in-memory-contact-repository";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { ClientNotFoundError, makeGetClientCard } from "./get-client-card";

const clientId: ClientId = makeId<"ClientId">("c1");
const productId: ProductId = makeId<"ProductId">("p1");

const client: Client = {
  id: clientId,
  name: "Test Client",
  type: "horeca",
  category: "B",
  responsibleManagerId: "m1",
};

const product: Product = { id: productId, sku: "SKU1", name: "Test Product", unit: "kg" };

const owner: Viewer = { id: "m1", role: "mop" }; // owns the client
const otherMop: Viewer = { id: "m2", role: "mop" }; // a different manager
const technologist: Viewer = { id: "tech-1", role: "technologist" };
const head: Viewer = { id: "head-1", role: "head" };

function buildGetClientCard() {
  const clients = new InMemoryClientRepository([client]);
  const contacts = new InMemoryContactRepository([
    {
      id: makeId<"ContactId">("c-1"),
      clientId,
      name: "John Tester",
      position: "Buyer",
      role: "decision_maker",
    },
  ]);
  const products = new InMemoryProductRepository([product]);
  const erp = new StubErpGateway(
    [{ clientId, productId, price: Money.dollars(100) }],
    [{ productId, freeQuantity: 42, unit: "kg" }],
    [{ clientId, debt: Money.dollars(30_000), creditLimit: Money.dollars(100_000) }],
  );
  return makeGetClientCard({ clients, contacts, products, erp });
}

describe("getClientCard", () => {
  it("the owning manager sees the individual price and the ERP stock level", async () => {
    const card = await buildGetClientCard()(clientId, owner);

    expect(card.client.name).toBe("Test Client");
    expect(card.lines).toHaveLength(1);

    const line = card.lines[0];
    expect(line?.price?.amountMinor).toBe(10000);
    expect(line?.freeQuantity).toBe(42);
    expect(card.balance?.debt.amountMinor).toBe(3_000_000);
    expect(card.balance?.creditLimit.amountMinor).toBe(10_000_000);
  });

  it("the technologist gets the stock level, but price and balance don't reach the response", async () => {
    const card = await buildGetClientCard()(clientId, technologist);

    const line = card.lines[0];
    expect(line).toBeDefined();
    expect(line?.freeQuantity).toBe(42);
    expect(line && "price" in line).toBe(false);
    expect("balance" in card).toBe(false);
  });

  it("the head of sales sees any client's card (not limited to an owner), with prices", async () => {
    const card = await buildGetClientCard()(clientId, head);
    expect(card.lines[0]?.price?.amountMinor).toBe(10000);
    expect(card.balance?.debt.amountMinor).toBe(3_000_000);
  });

  it("the card includes the client's contacts — even for a role without margin access", async () => {
    const mopCard = await buildGetClientCard()(clientId, owner);
    expect(mopCard.contacts).toHaveLength(1);
    expect(mopCard.contacts[0]?.role).toBe("decision_maker");
    // Contacts are "who to call", not a trade secret → visible to the technologist too.
    const techCard = await buildGetClientCard()(clientId, technologist);
    expect(techCard.contacts).toHaveLength(1);
  });

  it("a different manager does NOT see the client — ClientNotFoundError (no existence leak)", async () => {
    await expect(buildGetClientCard()(clientId, otherMop)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });

  it("throws ClientNotFoundError for an unknown client", async () => {
    await expect(buildGetClientCard()(makeId<"ClientId">("missing"), owner)).rejects.toBeInstanceOf(
      ClientNotFoundError,
    );
  });
});
