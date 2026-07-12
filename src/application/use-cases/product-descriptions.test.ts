import { describe, expect, it, vi } from "vitest";
import type { AiGateway } from "@/application/ports/ai-gateway";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { InMemoryProductDescriptionRepository } from "@/infrastructure/persistence/in-memory-product-description-repository";
import { makeGenerateProductDescriptions } from "./product-descriptions";

function product(id: string, withKit: boolean): Product {
  return {
    id: makeId<"ProductId">(id) as ProductId,
    sku: id,
    name: `Product ${id}`,
    unit: "kg",
    kit: withKit
      ? {
          category: "Chocolate",
          benefits: ["benefit"],
          marginPercent: 30,
          shelfLife: "12 mo",
          rsp: Money.dollars(100),
        }
      : undefined,
  };
}

function fakeAi(): AiGateway {
  return {
    describeProduct: vi.fn(async (input) => ({
      text: `Description ${input.name}`,
      sourceUrl: "https://example.test",
    })),
  } as unknown as AiGateway;
}

describe("generateProductDescriptions (batch)", () => {
  it("generates descriptions only for products with a kit and no existing description", async () => {
    const withKit = product("a", true);
    const noKit = product("b", false);
    const already = product("c", true);
    const products = new InMemoryProductRepository([withKit, noKit, already]);
    const descriptions = new InMemoryProductDescriptionRepository([
      { productId: already.id, text: "already exists", sourceUrl: null },
    ]);
    const ai = fakeAi();

    const result = await makeGenerateProductDescriptions({ products, descriptions, ai })();

    expect(result).toEqual({ generated: 1, total: 3 }); // only product "a"
    expect(ai.describeProduct).toHaveBeenCalledOnce();
    expect((await descriptions.get(withKit.id))?.text).toBe("Description Product a");
    expect((await descriptions.get(already.id))?.text).toBe("already exists"); // not overwritten
    expect(await descriptions.get(noKit.id)).toBeNull(); // no kit — skipped
  });

  it("a repeat run generates nothing (idempotent by presence)", async () => {
    const products = new InMemoryProductRepository([product("a", true)]);
    const descriptions = new InMemoryProductDescriptionRepository();
    const ai = fakeAi();
    const generate = makeGenerateProductDescriptions({ products, descriptions, ai });

    expect((await generate()).generated).toBe(1);
    expect((await generate()).generated).toBe(0);
  });
});
