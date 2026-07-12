import { describe, expect, it } from "vitest";
import type { Client } from "@/domain/client/client";
import type { Product } from "@/domain/product/product";
import { Money } from "@/domain/pricing/money";
import { makeId } from "@/domain/shared/id";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import {
  ClientNotFoundForSkuError,
  makeLaunchSkuQualification,
  SkuNotFoundError,
} from "./launch-sku-qualification";

const seedClient: Client = {
  id: makeId<"ClientId">("c1"),
  name: "Test Bakery",
  type: "artisan_baker",
  category: "B",
  responsibleManagerId: "m1",
};

const seedProduct: Product = {
  id: makeId<"ProductId">("p1"),
  sku: "TEST-001",
  name: "Test Filling",
  unit: "kg",
  kit: {
    category: "Fillings",
    benefits: ["Tasty", "Fast"],
    marginPercent: 30,
    shelfLife: "6 months",
    rsp: Money.dollars(400),
  },
};

function setup(
  clients: readonly Client[] = [seedClient],
  products: readonly Product[] = [seedProduct],
) {
  const dealsRepo = new InMemoryDealRepository([]);
  const clientsRepo = new InMemoryClientRepository(clients);
  const productsRepo = new InMemoryProductRepository(products);
  const launchSkuQualification = makeLaunchSkuQualification({
    deals: dealsRepo,
    clients: clientsRepo,
    products: productsRepo,
  });
  return { dealsRepo, launchSkuQualification };
}

describe("launchSkuQualification use-case", () => {
  it("creates a deal at the qualification stage with the new_sku goal", async () => {
    const { launchSkuQualification } = setup();
    const deal = await launchSkuQualification({
      productId: seedProduct.id,
      clientId: seedClient.id,
      responsibleManagerId: "m1",
    });
    expect(deal.stage).toBe("qualification");
    expect(deal.goal).toBe("new_sku");
  });

  it("includes the product name in the deal title", async () => {
    const { launchSkuQualification } = setup();
    const deal = await launchSkuQualification({
      productId: seedProduct.id,
      clientId: seedClient.id,
      responsibleManagerId: "m1",
    });
    expect(deal.title).toContain("Test Filling");
  });

  it("links the deal to the given client", async () => {
    const { launchSkuQualification } = setup();
    const deal = await launchSkuQualification({
      productId: seedProduct.id,
      clientId: seedClient.id,
      responsibleManagerId: "m1",
    });
    expect(deal.clientId).toBe(seedClient.id);
  });

  it("saves the deal in the repository", async () => {
    const { dealsRepo, launchSkuQualification } = setup();
    const deal = await launchSkuQualification({
      productId: seedProduct.id,
      clientId: seedClient.id,
      responsibleManagerId: "m1",
    });
    expect(await dealsRepo.findById(deal.id)).not.toBeNull();
  });

  it("throws SkuNotFoundError for a non-existent product", async () => {
    const { launchSkuQualification } = setup();
    await expect(
      launchSkuQualification({
        productId: makeId<"ProductId">("missing"),
        clientId: seedClient.id,
        responsibleManagerId: "m1",
      }),
    ).rejects.toBeInstanceOf(SkuNotFoundError);
  });

  it("throws ClientNotFoundForSkuError for a non-existent client", async () => {
    const { launchSkuQualification } = setup();
    await expect(
      launchSkuQualification({
        productId: seedProduct.id,
        clientId: makeId<"ClientId">("missing"),
        responsibleManagerId: "m1",
      }),
    ).rejects.toBeInstanceOf(ClientNotFoundForSkuError);
  });
});
