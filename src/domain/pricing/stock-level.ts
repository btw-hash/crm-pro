import type { ProductId } from "@/domain/product/product";

/** Free stock quantity for a product in the warehouse (on-hand minus reservations). */
export interface StockLevel {
  readonly productId: ProductId;
  readonly freeQuantity: number;
  readonly unit: string;
}
