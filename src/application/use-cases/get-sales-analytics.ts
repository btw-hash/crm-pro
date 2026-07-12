import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import { Money } from "@/domain/pricing/money";
import { summarizeSales } from "@/domain/sales/sales-summary";

/** Revenue row (manager/product) for the UI: label, amount string, share %. */
export interface RevenueLine {
  readonly label: string;
  readonly amount: string;
  readonly sharePercent: number;
}

export interface MonthlyPoint {
  readonly month: string;
  readonly amount: string;
  /** For scaling the bar in the UI. */
  readonly revenueMinor: number;
}

/** Flat view of sales analytics (Money -> strings) for presentation. */
export interface SalesAnalyticsView {
  readonly totalRevenue: string;
  readonly orderCount: number;
  readonly byManager: readonly RevenueLine[];
  readonly byProduct: readonly RevenueLine[];
  readonly byMonth: readonly MonthlyPoint[];
  readonly latestMonth: string | null;
  readonly latestMonthRevenue: string;
  /** Delta % of the latest month vs the previous one / the same month last year (null - no baseline). */
  readonly deltaVsPrevMonthPercent: number | null;
  readonly deltaVsPrevYearPercent: number | null;
}

/** Analytics scope: `managerId` -> a personal slice for just that manager; otherwise the whole department. */
export interface SalesAnalyticsScope {
  readonly managerId?: string;
}

export type GetSalesAnalytics = (scope?: SalesAnalyticsScope) => Promise<SalesAnalyticsView>;

/**
 * Sales analytics: revenue, breakdowns by manager and product, month-over-month
 * dynamics, comparison of the latest month with the previous one and with a year
 * ago. Numbers are a deterministic aggregation of ERP history (via the port), not
 * from AI. With `scope.managerId` a PERSONAL slice is computed (for the manager's
 * dashboard — only their own revenue); without it — the whole department (head of sales).
 */
export function makeGetSalesAnalytics(deps: {
  erp: ErpGateway;
  products: ProductRepository;
  labelManager: (id: string) => string;
}): GetSalesAnalytics {
  return async (scope) => {
    const [allOrders, products] = await Promise.all([
      deps.erp.getSalesHistory(),
      deps.products.list(),
    ]);
    const orders = scope?.managerId
      ? allOrders.filter((order) => order.managerId === scope.managerId)
      : allOrders;
    const summary = summarizeSales(orders);
    const productName = new Map<string, string>(products.map((p) => [p.id, p.name]));
    const fmt = (minor: number): string => Money.of(minor).format();
    const share = (minor: number): number =>
      summary.totalRevenueMinor > 0 ? Math.round((minor / summary.totalRevenueMinor) * 100) : 0;
    const delta = (now: number, base: number): number | null =>
      base > 0 ? Math.round(((now - base) / base) * 100) : null;
    const pop = summary.periodOverPeriod;

    return {
      totalRevenue: fmt(summary.totalRevenueMinor),
      orderCount: summary.orderCount,
      byManager: summary.byManager.map((row) => ({
        label: deps.labelManager(row.key),
        amount: fmt(row.revenueMinor),
        sharePercent: share(row.revenueMinor),
      })),
      byProduct: summary.byProduct.map((row) => ({
        label: productName.get(row.key) ?? row.key,
        amount: fmt(row.revenueMinor),
        sharePercent: share(row.revenueMinor),
      })),
      byMonth: summary.byMonth.map((row) => ({
        month: row.month,
        amount: fmt(row.revenueMinor),
        revenueMinor: row.revenueMinor,
      })),
      latestMonth: summary.latestMonth,
      latestMonthRevenue: fmt(pop.latestMonthMinor),
      deltaVsPrevMonthPercent: delta(pop.latestMonthMinor, pop.prevMonthMinor),
      deltaVsPrevYearPercent: delta(pop.latestMonthMinor, pop.prevYearMonthMinor),
    };
  };
}
