import { describe, expect, it, vi } from "vitest";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { makeListProductsWithStock } from "./list-products-with-stock";

function product(id: string): Product {
  return { id: makeId<"ProductId">(id) as ProductId, sku: id, name: `Product ${id}`, unit: "kg" };
}

function fakeErp(stockMap: Record<string, StockLevel | null>): ErpGateway {
  return {
    getStockLevel: vi.fn(async (productId: string) => stockMap[productId] ?? null),
  } as unknown as ErpGateway;
}

describe("listProductsWithStock", () => {
  it("merges the product with its stock level", async () => {
    const p1 = product("p1");
    const p2 = product("p2");
    const products = new InMemoryProductRepository([p1, p2]);
    const erp = fakeErp({
      p1: { productId: p1.id, freeQuantity: 100, unit: "kg" },
    });

    const result = await makeListProductsWithStock({ products, erp })();

    expect(result).toHaveLength(2);
    expect(result[0]!.product.id).toBe("p1");
    expect(result[0]!.stock?.freeQuantity).toBe(100);
    expect(result[1]!.product.id).toBe("p2");
    expect(result[1]!.stock).toBeNull();
  });

  it("no products — empty array", async () => {
    const products = new InMemoryProductRepository([]);
    const erp = fakeErp({});
    const result = await makeListProductsWithStock({ products, erp })();
    expect(result).toHaveLength(0);
  });

  it("fetches stock levels in parallel (one call per product)", async () => {
    const p1 = product("p1");
    const p2 = product("p2");
    const products = new InMemoryProductRepository([p1, p2]);
    const erp = fakeErp({});

    await makeListProductsWithStock({ products, erp })();

    expect(erp.getStockLevel).toHaveBeenCalledTimes(2);
  });
});
