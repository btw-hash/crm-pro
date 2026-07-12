import { describe, expect, it } from "vitest";
import type { SalesAnalyticsView } from "@/application/use-cases/get-sales-analytics";
import { buildAnalyticsCsv, DEFAULT_VIEW, exportFilename, resolveView } from "./analytics-view";

const months = [
  { month: "2025-12", amount: "$120", revenueMinor: 12_000 },
  { month: "2026-01", amount: "$130", revenueMinor: 13_000 },
  { month: "2026-02", amount: "$140", revenueMinor: 14_000 },
];

const sales: SalesAnalyticsView = {
  totalRevenue: "$770",
  orderCount: 7,
  byManager: [
    { label: "Peterson A.", amount: "$500", sharePercent: 65 },
    { label: "Owens D.", amount: "$270", sharePercent: 35 },
  ],
  byProduct: [{ label: "Cocoa Powder", amount: "$400", sharePercent: 52 }],
  byMonth: months,
  latestMonth: "2026-02",
  latestMonthRevenue: "$140",
  deltaVsPrevMonthPercent: 7,
  deltaVsPrevYearPercent: null,
};

describe("resolveView", () => {
  it("accepts valid breakdowns", () => {
    expect(resolveView("managers")).toBe("managers");
    expect(resolveView("products")).toBe("products");
  });

  it("garbage and undefined → default breakdown", () => {
    expect(resolveView(undefined)).toBe(DEFAULT_VIEW);
    expect(resolveView("")).toBe(DEFAULT_VIEW);
    expect(resolveView("nonsense")).toBe(DEFAULT_VIEW);
  });
});

describe("buildAnalyticsCsv", () => {
  it("builds breakdown-by-manager rows + monthly trend (sliced by the page)", () => {
    const csv = buildAnalyticsCsv(sales, "managers", months);
    expect(csv.headers).toEqual(["Section", "Breakdown", "Name", "Revenue", "Share"]);
    // 2 managers + 3 months
    expect(csv.rows).toHaveLength(5);
    expect(csv.rows[0]).toEqual(["Revenue", "Manager", "Peterson A.", "$500", "65%"]);
    expect(csv.rows[2]).toEqual(["Trend", "Month", "2025-12", "$120", ""]);
    expect(csv.rows.at(-1)).toEqual(["Trend", "Month", "2026-02", "$140", ""]);
  });

  it("breakdown by products uses byProduct", () => {
    const csv = buildAnalyticsCsv(sales, "products", months);
    expect(csv.rows[0]).toEqual(["Revenue", "Product", "Cocoa Powder", "$400", "52%"]);
    // 1 product + 3 months
    expect(csv.rows).toHaveLength(4);
  });

  it("empty month window → only breakdown rows", () => {
    const csv = buildAnalyticsCsv(sales, "managers", []);
    expect(csv.rows).toHaveLength(2);
  });
});

describe("exportFilename", () => {
  it("reflects the breakdown and the raw period (default — 4)", () => {
    expect(exportFilename("managers", undefined)).toBe("analytics-managers-4");
    expect(exportFilename("products", "12")).toBe("analytics-products-12");
    expect(exportFilename("managers", "all")).toBe("analytics-managers-all");
  });
});
