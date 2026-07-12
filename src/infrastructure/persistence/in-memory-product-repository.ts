import type { ProductRepository } from "@/application/ports/product-repository";
import type { Product, ProductId } from "@/domain/product/product";

export class InMemoryProductRepository implements ProductRepository {
  private products: Product[];

  constructor(seed: readonly Product[]) {
    this.products = [...seed];
  }

  async findById(id: ProductId): Promise<Product | null> {
    return this.products.find((product) => product.id === id) ?? null;
  }

  async list(): Promise<readonly Product[]> {
    return this.products;
  }

  async upsertMany(incoming: readonly Product[]): Promise<void> {
    const byId = new Map(this.products.map((p) => [p.id, p]));
    for (const product of incoming) {
      byId.set(product.id, product);
    }
    this.products = [...byId.values()];
  }
}
