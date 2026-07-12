import type { ClientId } from "@/domain/client/client";
import type { ProductId } from "@/domain/product/product";
import type { Money } from "./money";

/** A client's individual price for a product (from the ERP: price types/contracts/agreements). */
export interface IndividualPrice {
  readonly clientId: ClientId;
  readonly productId: ProductId;
  readonly price: Money;
}
