import type { MonthlyPoint, SalesAnalyticsView } from "@/application/use-cases/get-sales-analytics";

/**
 * Pure presentation logic for the analytics screen's breakdown: selecting the breakdown
 * via the URL parameter (`?view=`, managers/products) and assembling the CSV view from
 * ready-made DTOs (the numbers are computed by the server-side use-case). The trend period
 * is driven by `PeriodSelect`/`?period=` (#348) — we don't duplicate it here; the monthly
 * CSV rows are taken already sliced by the page. No effects, React, or domain types — easy
 * to cover with unit tests.
 */

/** Data breakdown by managers/products. Controlled via `?view=` (SSR). */
export type AnalyticsView = "managers" | "products";

/** Labels for the "Breakdown" switcher. */
export const VIEW_LABELS: Record<AnalyticsView, string> = {
  managers: "by manager",
  products: "by product",
};

export const DEFAULT_VIEW: AnalyticsView = "managers";

/** Normalizes the raw `?view=` into a valid breakdown (garbage/undefined → default). */
export function resolveView(raw: string | undefined): AnalyticsView {
  if (raw === "managers" || raw === "products") {
    return raw;
  }
  return DEFAULT_VIEW;
}

/** CSV headers and rows: breakdown by manager or product (based on the selected view). */
export interface AnalyticsCsv {
  readonly headers: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
}

/**
 * Builds the analytics CSV table from the ready-made DTO for the selected breakdown: revenue
 * rows (manager/product + share), then the monthly trend for the selected period (`months`
 * arrive already sliced by the page via `?period=`). Returns headers/rows for the shared
 * `ExportButton` (#313/#343) — we don't duplicate the CSV format/download logic.
 */
export function buildAnalyticsCsv(
  sales: SalesAnalyticsView,
  view: AnalyticsView,
  months: readonly MonthlyPoint[],
): AnalyticsCsv {
  const breakdown = view === "managers" ? sales.byManager : sales.byProduct;
  const breakdownLabel = view === "managers" ? "Manager" : "Product";

  const rows: (string | number)[][] = breakdown.map((row) => [
    "Revenue",
    breakdownLabel,
    row.label,
    row.amount,
    `${row.sharePercent}%`,
  ]);

  for (const point of months) {
    rows.push(["Trend", "Month", point.month, point.amount, ""]);
  }

  return {
    headers: ["Section", "Breakdown", "Name", "Revenue", "Share"],
    rows,
  };
}

/** Export file name: reflects the selected breakdown and the raw period (`?period=`, default "4"). */
export function exportFilename(view: AnalyticsView, periodParam: string | undefined): string {
  return `analytics-${view}-${periodParam ?? "4"}`;
}
