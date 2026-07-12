import type { Product, ProductId } from "@/domain/product/product";

export interface ProductRepository {
  findById(id: ProductId): Promise<Product | null>;
  list(): Promise<readonly Product[]>;
  /**
   * Saves/updates products by id (used by the nomenclature sync from the ERP).
   * Doesn't delete missing ones — deleting items removed from the ERP is left for
   * later (risk of FK issues from deals/orders). ERP fields are overwritten;
   * CRM-side enrichment is the caller's responsibility (merged in the use-case).
   */
  upsertMany(products: readonly Product[]): Promise<void>;
}
