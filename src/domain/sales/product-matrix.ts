import type { SalesOrder } from "./sales-order";

export type ProductTrend = "up" | "flat" | "down" | "dormant";

/** Row of the client's "product" matrix: purchase trend + last order. */
export interface ProductMatrixRow {
  readonly productId: string;
  readonly lastOrderMonth: string;
  /** Months since the last order (relative to referenceMonth). */
  readonly monthsSinceLast: number;
  readonly trend: ProductTrend;
  /** Revenue for the product over the last 3 months (cents). */
  readonly last3RevenueMinor: number;
}

function monthIndex(month: string): number {
  return Number(month.slice(0, 4)) * 12 + (Number(month.slice(5, 7)) - 1);
}

function indexToMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * Client purchase matrix by product: trend (growth/stable/decline/"gone") and
 * the month of the last order. Trend = revenue over the last 3 months vs the
 * previous 3 months; "dormant" — no orders for ≥3 months (churn/reorder risk).
 * A pure aggregation over history, no AI. `referenceMonth` is the "current"
 * month (the latest in the overall history) used to measure recency.
 */
export function buildProductMatrix(
  orders: readonly SalesOrder[],
  referenceMonth: string,
): readonly ProductMatrixRow[] {
  const refIdx = monthIndex(referenceMonth);
  const byProduct = new Map<string, Map<number, number>>();
  for (const order of orders) {
    const idx = monthIndex(order.orderedAt.slice(0, 7));
    for (const line of order.lines) {
      const monthMap = byProduct.get(line.productId) ?? new Map<number, number>();
      monthMap.set(idx, (monthMap.get(idx) ?? 0) + line.amount.amountMinor);
      byProduct.set(line.productId, monthMap);
    }
  }

  const rows: ProductMatrixRow[] = [];
  for (const [productId, monthMap] of byProduct) {
    const lastIdx = Math.max(...monthMap.keys());
    const monthsSinceLast = refIdx - lastIdx;
    const sumRange = (from: number, to: number): number => {
      let sum = 0;
      for (let i = from; i <= to; i += 1) sum += monthMap.get(i) ?? 0;
      return sum;
    };
    const last3 = sumRange(refIdx - 2, refIdx);
    const prior3 = sumRange(refIdx - 5, refIdx - 3);
    const trend: ProductTrend =
      monthsSinceLast >= 3
        ? "dormant"
        : prior3 === 0
          ? "up"
          : last3 > prior3 * 1.1
            ? "up"
            : last3 < prior3 * 0.9
              ? "down"
              : "flat";
    rows.push({
      productId,
      lastOrderMonth: indexToMonth(lastIdx),
      monthsSinceLast,
      trend,
      last3RevenueMinor: last3,
    });
  }

  // Sorting: by 3-month revenue (descending), then "freshness" (recency ascending).
  return rows.sort(
    (a, b) => b.last3RevenueMinor - a.last3RevenueMinor || a.monthsSinceLast - b.monthsSinceLast,
  );
}
