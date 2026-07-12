import type { Client } from "@/domain/client/client";
import type { Product } from "@/domain/product/product";
import type { SalesOrder } from "@/domain/sales/sales-order";

/** Product recommendation for a client (next-best-product) with a score and rationale. */
export interface ProductRecommendation {
  readonly productId: string;
  /** Score 1–10 (as in Puratos) — deterministic, from code (not AI). */
  readonly score: number;
  readonly reason: string;
}

/**
 * Deterministic scorer for "what to offer the client" (next-best-product):
 * products the client is NOT already buying, but similar clients (by ABC
 * category/type) do buy, adjusted for margin. Numbers are computed by code,
 * AI does not make them up. Reactivating already-bought (churning) SKUs is
 * handled separately in the matrix/visit prep.
 */
export function recommendProducts(input: {
  targetClient: Client;
  clients: readonly Client[];
  products: readonly Product[];
  orders: readonly SalesOrder[];
}): readonly ProductRecommendation[] {
  const { targetClient, clients, products, orders } = input;

  const similar = clients.filter(
    (c) =>
      c.id !== targetClient.id &&
      (c.category === targetClient.category || c.type === targetClient.type),
  );
  const similarIds = new Set(similar.map((c) => c.id));

  // Products the target client already bought (excluded — not "new").
  const alreadyBought = new Set<string>();
  for (const order of orders) {
    if (order.clientId === targetClient.id) {
      for (const line of order.lines) alreadyBought.add(line.productId);
    }
  }

  const recommendations: ProductRecommendation[] = [];
  for (const product of products) {
    if (alreadyBought.has(product.id)) continue;

    const buyers = new Set<string>();
    for (const order of orders) {
      if (similarIds.has(order.clientId)) {
        for (const line of order.lines) {
          if (line.productId === product.id) buyers.add(order.clientId);
        }
      }
    }
    const popularity = similar.length > 0 ? buyers.size / similar.length : 0;
    const margin = product.kit?.marginPercent ?? 0;

    // No reason to recommend (none of the similar clients buy it and there's no margin data).
    if (buyers.size === 0 && margin === 0) continue;

    const score = Math.max(1, Math.min(10, Math.round(popularity * 7 + (margin / 100) * 4)));
    const reason =
      buyers.size > 0
        ? `Bought by ${buyers.size} of ${similar.length} similar clients${margin ? `, margin ${margin}%` : ""}`
        : `Margin ${margin}%`;
    recommendations.push({ productId: product.id, score, reason });
  }

  return recommendations.sort((a, b) => b.score - a.score);
}
