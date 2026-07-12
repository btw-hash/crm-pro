import { redirect } from "next/navigation";
import type { AssortmentTrend } from "@/domain/sales/assortment";
import type { ProcurementSignal } from "@/domain/purchase/procurement-analysis";
import type { PromoAction } from "@/domain/sales/promotion";
import { OpsFilters } from "@/app/_components/ops-filters";
import { ExportButton } from "@/app/_components/export-button";
import { OpsHeader, SectionTitle, StatusBadge } from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";
import { canManageProcurement } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";

const ASSORTMENT_FILTERS: Record<string, (trend: AssortmentTrend) => boolean> = {
  all: () => true,
  growth: (t) => t === "growth",
  stable: (t) => t === "stable",
  dead: (t) => t === "dead",
};

const PROMO_ICON: Record<PromoAction, string> = { liquidate: "🔻", stimulate: "📣" };

const TREND_FLAG: Record<AssortmentTrend, boolean> = {
  dead: true,
  declining: true,
  stable: false,
  growth: false,
};

const TREND_ICON: Record<AssortmentTrend, string> = {
  dead: "✕",
  declining: "↓",
  stable: "—",
  growth: "↑",
};

const PROC_FLAG: Record<ProcurementSignal, boolean> = {
  shortage: true,
  overstock: true,
  ok: false,
};
const PROC_ICON: Record<ProcurementSignal, string> = { shortage: "▲", overstock: "▼", ok: "—" };

function monthsLabel(m: number | null): string {
  return m === null ? "∞ (no sales)" : `${m.toFixed(1)} mo`;
}

const SALES_COLUMNS: DataColumn[] = [
  { label: "#", flex: 0.4 },
  { label: "Product" },
  { label: "Category" },
  { label: "Revenue (3 mo)" },
  { label: "Units" },
  { label: "Margin" },
  { label: "Gross margin" },
  { label: "Signal", flex: 2, sortable: false },
];

const PROMO_COLUMNS: DataColumn[] = [
  { label: "Product" },
  { label: "Category" },
  { label: "Trend" },
  { label: "Stock" },
  { label: "No sales for" },
  { label: "Action" },
  { label: "Send to (managers)", flex: 2, sortable: false },
];

const PROC_COLUMNS: DataColumn[] = [
  { label: "Product" },
  { label: "Category" },
  { label: "Purchased (3 mo)" },
  { label: "Sold, units" },
  { label: "Stock" },
  { label: "Months of stock" },
  { label: "Recommendation", flex: 2, sortable: false },
];

const SECTION_NOTE: React.CSSProperties = {
  font: "400 13px/1.5 Arial",
  color: "#9a9ea8",
  margin: "0 0 12px",
};

/**
 * Assortment analytics — sales analysis (#177) for the category manager: for each item a
 * stop/hold/grow signal (by sales trend) and a rank by GROSS MARGIN (money × margin), not
 * by units. Numbers come from sales history deterministically (not AI).
 */
export default async function AssortmentPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canManageProcurement(user.role)) {
    redirect("/");
  }
  const [rows, procurement, promotions] = await Promise.all([
    getContainer().getAssortmentAnalysis(),
    getContainer().getProcurementAnalysis(),
    getContainer().getAssortmentPromotions(),
  ]);
  const topUnits = [...rows].sort((a, b) => b.units - a.units)[0];

  const filter = (await searchParams).filter ?? "all";
  const predicate = ASSORTMENT_FILTERS[filter] ?? (() => true);
  const visibleRows = rows.filter((row) => predicate(row.trend));

  const exportRows = visibleRows.map(
    (row) =>
      [
        row.valueRank,
        row.productName,
        row.category,
        `${TREND_ICON[row.trend]} ${row.actionLabel}`,
        row.revenue,
        row.units,
        `${row.marginPercent}%`,
        row.grossMargin,
      ] as const,
  );

  const salesRows: DataRow[] = visibleRows.map((row) => ({
    id: row.productId,
    cells: [
      <span key="r" style={{ color: "#9a9ea8" }}>
        {row.valueRank}
      </span>,
      row.productName,
      <span key="c" style={{ color: "#9a9ea8" }}>
        {row.category}
      </span>,
      row.revenue,
      row.units.toLocaleString("en-US"),
      <span key="m" style={{ color: "#9a9ea8" }}>
        {row.marginPercent}%
      </span>,
      <span key="g" style={{ fontWeight: 700 }}>
        {row.grossMargin}
      </span>,
      <span key="s">
        <StatusBadge tone={TREND_FLAG[row.trend] ? "bad" : "ok"}>
          {TREND_ICON[row.trend]} {row.actionLabel}
        </StatusBadge>
        {row.monthsSinceLastSale !== null && row.monthsSinceLastSale >= 3 ? (
          <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
            {" "}
            · {row.monthsSinceLastSale} mo without sales
          </span>
        ) : null}
      </span>,
    ],
    sortValues: [
      row.valueRank,
      row.productName,
      row.category,
      row.revenue,
      row.units,
      row.marginPercent,
      row.grossMargin,
      null,
    ],
  }));

  const promoRows: DataRow[] = promotions.map((row) => ({
    id: row.productId,
    cells: [
      row.productName,
      <span key="c" style={{ color: "#9a9ea8" }}>
        {row.category}
      </span>,
      TREND_ICON[row.trend],
      row.currentStockUnits.toLocaleString("en-US"),
      <span key="n" style={{ color: "#9a9ea8" }}>
        {row.monthsSinceLastSale === null ? "never sold" : `${row.monthsSinceLastSale} mo`}
      </span>,
      <StatusBadge key="a" tone="warn">
        {PROMO_ICON[row.action]} {row.actionLabel}
      </StatusBadge>,
      <span key="s" style={{ color: "#9a9ea8" }}>
        {row.sellers.length > 0
          ? row.sellers.map((id) => personLabel(id)).join(", ")
          : "— (never sold)"}
      </span>,
    ],
    sortValues: [
      row.productName,
      row.category,
      row.trend,
      row.currentStockUnits,
      row.monthsSinceLastSale,
      row.actionLabel,
      null,
    ],
  }));

  const procRows: DataRow[] = procurement.map((row) => ({
    id: row.productId,
    cells: [
      row.productName,
      <span key="c" style={{ color: "#9a9ea8" }}>
        {row.category}
      </span>,
      <span key="b">
        {row.boughtAmount}{" "}
        <span style={{ color: "#9a9ea8" }}>· {row.boughtUnits.toLocaleString("en-US")} units</span>
      </span>,
      row.soldUnits.toLocaleString("en-US"),
      row.currentStock.toLocaleString("en-US"),
      monthsLabel(row.monthsOfStock),
      <span key="s">
        {PROC_FLAG[row.signal] ? (
          <StatusBadge tone={row.signal === "shortage" ? "bad" : "warn"}>
            {PROC_ICON[row.signal]} {row.actionLabel}
          </StatusBadge>
        ) : (
          <StatusBadge tone="ok">
            {PROC_ICON[row.signal]} {row.actionLabel}
          </StatusBadge>
        )}
        {row.recommendedBuyUnits > 0 ? (
          <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
            {" "}
            · buy ~{row.recommendedBuyUnits.toLocaleString("en-US")} more units
          </span>
        ) : null}
      </span>,
    ],
    sortValues: [
      row.productName,
      row.category,
      row.boughtUnits,
      row.soldUnits,
      row.currentStock,
      row.monthsOfStock,
      null,
    ],
  }));

  return (
    <div className="scr">
      <OpsHeader
        title="Assortment analytics"
        breadcrumb="Operations › ERP data"
        action={
          <ExportButton
            filename="assortment"
            headers={[
              "#",
              "Product",
              "Category",
              "Signal",
              "Revenue (3 mo)",
              "Units",
              "Margin",
              "Gross margin",
            ]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[
          { label: "All", value: "all" },
          { label: "Grow", value: "growth" },
          { label: "Hold", value: "stable" },
          { label: "Stop", value: "dead" },
        ]}
        metrics={[
          { value: rows.length, label: "items", color: "var(--accent)", bordered: false },
          { value: promotions.length, label: "to promote", color: "#9a6a00", bordered: true },
          { value: procurement.length, label: "to procure", color: "#197a48", bordered: true },
        ]}
      />

      <SectionTitle style={{ margin: "0 0 6px" }}>
        Sales — what to sell off, hold, grow
      </SectionTitle>
      <p style={SECTION_NOTE}>
        Signal for each item over the last 3 months. Rank is by <strong>gross margin</strong> (money
        × margin), not by units: cheap high-volume items don&apos;t rank as the most "valuable" (not
        a naive ABC). Numbers come from sales history, AI is not involved.
      </p>

      {topUnits ? (
        <p style={SECTION_NOTE}>
          Counter-example: "{topUnits.productName}" has the most units sold (
          {topUnits.units.toLocaleString("en-US")} units), but by value it ranks #
          {topUnits.valueRank} — volume ≠ value.
        </p>
      ) : null}

      <div style={{ marginBottom: "24px" }}>
        <DataTable
          columns={SALES_COLUMNS}
          rows={salesRows}
          initialSort={{ index: 0, dir: "asc" }}
          emptyText="Nothing matches this filter."
        />
      </div>

      <SectionTitle style={{ margin: "0 0 6px" }}>
        Promotions & mailers — move frozen stock
      </SectionTitle>
      <p style={SECTION_NOTE}>
        Items with weak <strong>turnover</strong> (dead/declining trend) but with stock on hand —
        frozen money. Suggestion: sell off with a promo or a targeted mailer to clients who bought
        it before. Numbers come from the ERP (sales + stock), AI is not involved.
      </p>
      <div style={{ marginBottom: "24px" }}>
        <DataTable
          columns={PROMO_COLUMNS}
          rows={promoRows}
          emptyText="No frozen dead stock — nothing to move 👍"
        />
      </div>

      <SectionTitle style={{ margin: "0 0 6px" }}>
        Procurement — what to buy more of, hold, cut
      </SectionTitle>
      <p style={SECTION_NOTE}>
        Comparing purchased ↔ turnover over 3 months and current stock. The key metric is{" "}
        <strong>months of stock</strong> (stock ÷ sales rate), not raw stock: low — buy more,
        high/sitting — cut purchasing. Numbers come from the ERP (receipts/sales/stock), AI is not
        involved.
      </p>
      <DataTable columns={PROC_COLUMNS} rows={procRows} emptyText="No procurement data." />
    </div>
  );
}
