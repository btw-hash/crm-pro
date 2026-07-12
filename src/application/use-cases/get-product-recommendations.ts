import type { ClientRepository } from "@/application/ports/client-repository";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ClientId } from "@/domain/client/client";
import { recommendProducts } from "@/domain/sales/recommendation";

export interface ProductRecommendationView {
  readonly productName: string;
  readonly score: number;
  readonly reason: string;
}

export type GetProductRecommendations = (input: {
  clientId: ClientId;
}) => Promise<readonly ProductRecommendationView[]>;

const TOP_N = 6;

/**
 * "What to offer the client" recommendations (next-best-product): a deterministic
 * scorer over sales history and margin (numbers from code, not AI). Top-N
 * products the client doesn't buy yet but are popular with similar clients.
 */
export function makeGetProductRecommendations(deps: {
  clients: ClientRepository;
  products: ProductRepository;
  erp: ErpGateway;
}): GetProductRecommendations {
  return async ({ clientId }) => {
    const target = await deps.clients.findById(clientId);
    if (!target) {
      return [];
    }
    const [clients, products, orders] = await Promise.all([
      deps.clients.list(),
      deps.products.list(),
      deps.erp.getSalesHistory(),
    ]);
    const productName = new Map<string, string>(products.map((p) => [p.id, p.name]));
    const recommendations = recommendProducts({ targetClient: target, clients, products, orders });
    return recommendations.slice(0, TOP_N).map((rec) => ({
      productName: productName.get(rec.productId) ?? rec.productId,
      score: rec.score,
      reason: rec.reason,
    }));
  };
}
