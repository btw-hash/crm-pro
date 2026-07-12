import type { ProductDescriptionRepository } from "@/application/ports/product-description-repository";
import type { ProductId } from "@/domain/product/product";
import type { ProductDescription } from "@/domain/product/product-description";

/** In-memory storage for AI product descriptions (demo; a separate table/DB in production). */
export class InMemoryProductDescriptionRepository implements ProductDescriptionRepository {
  private readonly byProduct = new Map<string, ProductDescription>();

  constructor(seed: readonly ProductDescription[] = []) {
    for (const description of seed) this.byProduct.set(description.productId, description);
  }

  async list(): Promise<readonly ProductDescription[]> {
    return [...this.byProduct.values()];
  }

  async get(productId: ProductId): Promise<ProductDescription | null> {
    return this.byProduct.get(productId) ?? null;
  }

  async save(description: ProductDescription): Promise<void> {
    this.byProduct.set(description.productId, description);
  }
}
