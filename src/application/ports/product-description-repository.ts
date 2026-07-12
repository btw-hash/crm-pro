import type { ProductId } from "@/domain/product/product";
import type { ProductDescription } from "@/domain/product/product-description";

/** Storage for AI-generated product descriptions ("separate DB", filled in batches — not realtime). */
export interface ProductDescriptionRepository {
  list(): Promise<readonly ProductDescription[]>;
  get(productId: ProductId): Promise<ProductDescription | null>;
  save(description: ProductDescription): Promise<void>;
}
