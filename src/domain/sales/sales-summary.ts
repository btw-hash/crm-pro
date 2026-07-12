import type { SalesOrder } from "./sales-order";

/** Revenue by key (manager/product), in minor units (cents). */
export interface RevenueByKey {
  readonly key: string;
  readonly revenueMinor: number;
}

export interface MonthlyRevenue {
  readonly month: string; // "YYYY-MM"
  readonly revenueMinor: number;
}

/** Sales summary (deterministic aggregation of order history). Amounts are in cents. */
export interface SalesSummary {
  readonly totalRevenueMinor: number;
  readonly orderCount: number;
  /** Revenue by manager, descending. */
  readonly byManager: readonly RevenueByKey[];
  /** Revenue by product, descending. */
  readonly byProduct: readonly RevenueByKey[];
  /** Revenue by month, chronologically. */
  readonly byMonth: readonly MonthlyRevenue[];
  readonly latestMonth: string | null;
  /** Revenue: latest month / previous month / the same month a year ago. */
  readonly periodOverPeriod: {
    readonly latestMonthMinor: number;
    readonly prevMonthMinor: number;
    readonly prevYearMonthMinor: number;
  };
}

/** Shifts the "YYYY-MM" month label by delta months. */
export function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4));
  const monthNum = Number(month.slice(5, 7));
  const total = year * 12 + (monthNum - 1) + delta;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

function sortedDesc(map: Map<string, number>): RevenueByKey[] {
  return [...map.entries()]
    .map(([key, revenueMinor]) => ({ key, revenueMinor }))
    .sort((a, b) => b.revenueMinor - a.revenueMinor);
}

/** Aggregates sales history into a summary. Pure function, no side effects. */
export function summarizeSales(orders: readonly SalesOrder[]): SalesSummary {
  let total = 0;
  const byManager = new Map<string, number>();
  const byProduct = new Map<string, number>();
  const byMonth = new Map<string, number>();

  for (const order of orders) {
    const amount = order.total.amountMinor;
    total += amount;
    byManager.set(order.managerId, (byManager.get(order.managerId) ?? 0) + amount);
    const month = order.orderedAt.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + amount);
    for (const line of order.lines) {
      byProduct.set(line.productId, (byProduct.get(line.productId) ?? 0) + line.amount.amountMinor);
    }
  }

  const months = [...byMonth.keys()].sort();
  const latestMonth = months.at(-1) ?? null;
  const periodOverPeriod = latestMonth
    ? {
        latestMonthMinor: byMonth.get(latestMonth) ?? 0,
        prevMonthMinor: byMonth.get(shiftMonth(latestMonth, -1)) ?? 0,
        prevYearMonthMinor: byMonth.get(shiftMonth(latestMonth, -12)) ?? 0,
      }
    : { latestMonthMinor: 0, prevMonthMinor: 0, prevYearMonthMinor: 0 };

  return {
    totalRevenueMinor: total,
    orderCount: orders.length,
    byManager: sortedDesc(byManager),
    byProduct: sortedDesc(byProduct),
    byMonth: months.map((month) => ({ month, revenueMinor: byMonth.get(month) ?? 0 })),
    latestMonth,
    periodOverPeriod,
  };
}
