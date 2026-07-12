import type { ProductRepository } from "@/application/ports/product-repository";
import type { Product } from "@/domain/product/product";

export type ListProducts = () => Promise<readonly Product[]>;

export function makeListProducts(deps: { products: ProductRepository }): ListProducts {
  return () => deps.products.list();
}
