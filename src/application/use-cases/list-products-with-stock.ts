import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { Product } from "@/domain/product/product";

export interface ProductWithStock {
  readonly product: Product;
  readonly stock: StockLevel | null;
}

export type ListProductsWithStock = () => Promise<readonly ProductWithStock[]>;

/**
 * Loads the list of products and their stock levels in parallel.
 * Stock is null when the ERP has no record (treated as "no data").
 */
export function makeListProductsWithStock(deps: {
  products: ProductRepository;
  erp: ErpGateway;
}): ListProductsWithStock {
  return async () => {
    const products = await deps.products.list();
    const stocks = await Promise.all(products.map((p) => deps.erp.getStockLevel(p.id)));
    return products.map((product, i) => ({ product, stock: stocks[i] ?? null }));
  };
}
