import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ClientId } from "@/domain/client/client";
import { createDeal, type Deal } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";

export class SkuNotFoundError extends Error {
  constructor(readonly productId: ProductId) {
    super(`Product not found: ${productId}`);
    this.name = "SkuNotFoundError";
  }
}

export class ClientNotFoundForSkuError extends Error {
  constructor(readonly clientId: ClientId) {
    super(`Client not found: ${clientId}`);
    this.name = "ClientNotFoundForSkuError";
  }
}

export interface LaunchSkuQualificationInput {
  readonly productId: ProductId;
  readonly clientId: ClientId;
  readonly responsibleManagerId: string;
}

export type LaunchSkuQualification = (input: LaunchSkuQualificationInput) => Promise<Deal>;

export function makeLaunchSkuQualification(deps: {
  deals: DealRepository;
  clients: ClientRepository;
  products: ProductRepository;
}): LaunchSkuQualification {
  return async function launchSkuQualification(input) {
    const [product, client] = await Promise.all([
      deps.products.findById(input.productId),
      deps.clients.findById(input.clientId),
    ]);
    if (!product) {
      throw new SkuNotFoundError(input.productId);
    }
    if (!client) {
      throw new ClientNotFoundForSkuError(input.clientId);
    }
    const deal = createDeal({
      id: makeId<"DealId">(crypto.randomUUID()),
      clientId: input.clientId,
      title: `New SKU introduction: ${product.name}`,
      responsibleManagerId: input.responsibleManagerId,
      goal: "new_sku",
    });
    await deps.deals.save(deal);
    return deal;
  };
}
