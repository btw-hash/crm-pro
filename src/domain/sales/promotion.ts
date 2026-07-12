import type { SalesOrder } from "@/domain/sales/sales-order";
import type { AssortmentRow, AssortmentTrend } from "./assortment";

/**
 * Candidates for a promotion/outreach: items with weak sell-through (dead/declining
 * by trend), but with stock on hand — frozen money that needs to be moved via a
 * promotion or targeted outreach to clients who bought the item before.
 * Deterministic from sales+stock (not AI).
 */

export type PromoAction = "liquidate" | "stimulate";

export const PROMO_ACTION_LABELS: Record<PromoAction, string> = {
  liquidate: "Sell off: promotion + outreach to clients who bought it before",
  stimulate: "Stimulate: promotion/outreach until demand drops to zero",
};

export interface PromoCandidate {
  readonly productId: string;
  readonly productName: string;
  readonly category: string;
  readonly trend: AssortmentTrend;
  readonly monthsSinceLastSale: number | null;
  readonly currentStockUnits: number;
  readonly action: PromoAction;
  /** Managers who sold the item before (their clients go into the outreach). */
  readonly sellers: readonly string[];
}

/** Who sold each item (from history) — to target outreach to the right managers. */
export function collectSellersByProduct(
  orders: readonly SalesOrder[],
): ReadonlyMap<string, readonly string[]> {
  const sets = new Map<string, Set<string>>();
  for (const order of orders) {
    for (const line of order.lines) {
      const set = sets.get(line.productId) ?? new Set<string>();
      set.add(order.managerId);
      sets.set(line.productId, set);
    }
  }
  return new Map([...sets].map(([productId, managers]) => [productId, [...managers].sort()]));
}

/**
 * Candidates for a promotion/outreach: item is dead/declining AND has stock
 * (frozen money). dead → sell off (urgent, sitting idle); declining → stimulate
 * (before demand dies). Sorted with more stock on top.
 */
export function suggestPromotions(input: {
  rows: readonly AssortmentRow[];
  stockUnits: ReadonlyMap<string, number>;
  sellersByProduct: ReadonlyMap<string, readonly string[]>;
}): readonly PromoCandidate[] {
  const candidates: PromoCandidate[] = [];
  for (const row of input.rows) {
    const currentStockUnits = input.stockUnits.get(row.productId) ?? 0;
    if (currentStockUnits <= 0) continue;
    if (row.trend !== "dead" && row.trend !== "declining") continue;
    candidates.push({
      productId: row.productId,
      productName: row.productName,
      category: row.category,
      trend: row.trend,
      monthsSinceLastSale: row.monthsSinceLastSale,
      currentStockUnits,
      action: row.trend === "dead" ? "liquidate" : "stimulate",
      sellers: input.sellersByProduct.get(row.productId) ?? [],
    });
  }
  return candidates.sort((a, b) => b.currentStockUnits - a.currentStockUnits);
}
