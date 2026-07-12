import type { Product } from "@/domain/product/product";
import type { SalesOrder } from "@/domain/sales/sales-order";

/** Signal for an assortment item (based on sales over the period). */
export type AssortmentTrend = "dead" | "declining" | "stable" | "growth";

export const ASSORTMENT_ACTION_LABELS: Record<AssortmentTrend, string> = {
  dead: "Stop — sell off, do not restock",
  declining: "Caution — demand falling",
  stable: "Hold",
  growth: "Grow — order more",
};

export interface AssortmentRow {
  readonly productId: string;
  readonly productName: string;
  readonly category: string;
  /** Revenue over the last 3 months, in cents (money — not units). */
  readonly revenueLast3Minor: number;
  /** Units over the last 3 months (for the naive-ABC counter-example). */
  readonly unitsLast3: number;
  readonly marginPercent: number;
  /** Gross margin over 3 months (revenue×margin%) — a measure of the item's "value". */
  readonly grossMarginLast3Minor: number;
  /** Months with no sales; null — never sold at all. */
  readonly monthsSinceLastSale: number | null;
  readonly trend: AssortmentTrend;
  /** Rank by value (1 — most valuable by gross margin). */
  readonly valueRank: number;
}

const NO_MARGIN_CATEGORY = "No category";

/** Month "YYYY-MM" → comparable index (year*12 + month). */
function monthIndex(month: string): number {
  const [y, m] = month.split("-");
  return Number(y) * 12 + (Number(m) - 1);
}

/**
 * Assortment sales analysis for the category manager: for each item — revenue/
 * units/gross margin over the last 3 months, trend, and a "stop/hold/grow"
 * signal. Ranked by GROSS MARGIN (money×margin), not by units — so cheap
 * high-volume items don't rise to the top of "value" (not naive ABC). Numbers
 * come deterministically from sales history; AI is not involved.
 */
export function analyzeAssortment(input: {
  orders: readonly SalesOrder[];
  products: readonly Product[];
  /** Reference month "YYYY-MM"; defaults to the latest month in the history. */
  referenceMonth?: string;
}): readonly AssortmentRow[] {
  const { orders, products } = input;

  // Aggregation by product×month: revenue (cents) and units.
  const revByProductMonth = new Map<string, Map<string, number>>();
  const unitsByProductMonth = new Map<string, Map<string, number>>();
  let maxMonth = input.referenceMonth ?? "";
  for (const order of orders) {
    const month = order.orderedAt.slice(0, 7);
    if (!input.referenceMonth && month > maxMonth) {
      maxMonth = month;
    }
    for (const line of order.lines) {
      const rev = revByProductMonth.get(line.productId) ?? new Map<string, number>();
      rev.set(month, (rev.get(month) ?? 0) + line.amount.amountMinor);
      revByProductMonth.set(line.productId, rev);
      const units = unitsByProductMonth.get(line.productId) ?? new Map<string, number>();
      units.set(month, (units.get(month) ?? 0) + line.quantity);
      unitsByProductMonth.set(line.productId, units);
    }
  }
  const refIndex = maxMonth === "" ? 0 : monthIndex(maxMonth);

  const rows = products.map((product): Omit<AssortmentRow, "valueRank"> => {
    const rev = revByProductMonth.get(product.id) ?? new Map<string, number>();
    const units = unitsByProductMonth.get(product.id) ?? new Map<string, number>();

    const sumWindow = (source: Map<string, number>, fromBack: number, toBack: number): number => {
      let sum = 0;
      for (const [month, value] of source) {
        const back = refIndex - monthIndex(month);
        if (back >= fromBack && back <= toBack) sum += value;
      }
      return sum;
    };
    const revenueLast3Minor = sumWindow(rev, 0, 2);
    const priorRevenue = sumWindow(rev, 3, 5);
    const unitsLast3 = sumWindow(units, 0, 2);

    let lastSaleBack: number | null = null;
    for (const [month, value] of rev) {
      if (value > 0) {
        const back = refIndex - monthIndex(month);
        if (lastSaleBack === null || back < lastSaleBack) lastSaleBack = back;
      }
    }
    const monthsSinceLastSale = lastSaleBack;

    let trend: AssortmentTrend;
    if (monthsSinceLastSale === null || monthsSinceLastSale >= 3) {
      trend = "dead";
    } else if (priorRevenue > 0) {
      if (revenueLast3Minor > priorRevenue * 1.15) trend = "growth";
      else if (revenueLast3Minor < priorRevenue * 0.85) trend = "declining";
      else trend = "stable";
    } else {
      trend = revenueLast3Minor > 0 ? "growth" : "dead";
    }

    const marginPercent = product.kit?.marginPercent ?? 0;
    return {
      productId: product.id,
      productName: product.name,
      category: product.kit?.category ?? NO_MARGIN_CATEGORY,
      revenueLast3Minor,
      unitsLast3,
      marginPercent,
      grossMarginLast3Minor: Math.round((revenueLast3Minor * marginPercent) / 100),
      monthsSinceLastSale,
      trend,
    };
  });

  // Rank by gross margin (money×margin), not by units.
  return [...rows]
    .sort((a, b) => b.grossMarginLast3Minor - a.grossMarginLast3Minor)
    .map((row, index) => ({ ...row, valueRank: index + 1 }));
}
