import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { OpsFilters } from "@/app/_components/ops-filters";
import { OpsHeader, StatusBadge } from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";
import { canAccessAccountingStage } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { markAccountedAction } from "./actions";

function fmtKg(kg: number): string {
  return `${kg.toLocaleString("en-US")} kg`;
}

// Package of documents that the accountant prepares before handing the order to the warehouse.
const DOCS = ["Invoice", "Packing Slip", "Bill of Lading"];

// Stage-transition button — the section's real functionality (accountant done → to warehouse).
// The presentational reference doesn't describe it, but we keep the functionality per project rules.
const NEXT_STAGE_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 12px Arial",
  padding: "8px 14px",
  borderRadius: "999px",
  cursor: "pointer",
};

// Single generic reference table (board 10). The reference's meaningful columns are
// "Invoice · Client · Amount · Due · Status"; here it's the order-processing queue
// (no invoice number/amount in the source), so the columns come from the real order
// data: "Order · Client · Date · Weight · Documents · Status" + stage transition.
const ACCOUNTING_COLUMNS: DataColumn[] = [
  { label: "Order" },
  { label: "Client", flex: 2 },
  { label: "Date" },
  { label: "Weight", align: "right" },
  { label: "Documents", flex: 2, sortable: false },
  { label: "Status" },
  { label: "", align: "right", sortable: false },
];

// All rows have status in_accounting — the only stage in this queue.
// There's no field that actually distinguishes one row from another at the filter
// level: nothing to filter by, so we keep a single "All" chip.
const ACCOUNTING_FILTERS: Record<string, () => boolean> = {
  all: () => true,
};

/**
 * Accountant section: orders at the accounting stage (in_accounting). The accountant
 * prepares the ERP documents and hands the order off to the warehouse (in_accounting → in_warehouse).
 * Brought in line with the reference's single generic table: one glass panel-table right
 * under OpsHeader/OpsFilters, with no intermediate section headers or explanations.
 */
export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canAccessAccountingStage(user.role)) {
    redirect("/");
  }

  const rows = await getContainer().listAccountingShipments();

  const filter = (await searchParams).filter ?? "all";
  const predicate = ACCOUNTING_FILTERS[filter] ?? (() => true);
  const visibleRows = rows.filter(() => predicate());

  const totalWeightKg = visibleRows.reduce((sum, r) => sum + r.totalWeightKg, 0);

  const exportRows = visibleRows.map((row) => [
    row.orderNumber,
    row.clientName,
    row.scheduledDate,
    fmtKg(row.totalWeightKg),
    DOCS.join(", "),
    row.statusLabel,
  ]);

  const accountingRows: DataRow[] = visibleRows.map((row) => ({
    id: row.shipmentId,
    cells: [
      <span key="o" style={{ color: "#9a9ea8" }}>
        {row.orderNumber}
      </span>,
      row.clientName,
      <span key="d" style={{ color: "#9a9ea8" }}>
        {row.scheduledDate}
      </span>,
      <span key="w" style={{ fontWeight: 700 }}>
        {fmtKg(row.totalWeightKg)}
      </span>,
      <span key="docs" style={{ color: "#9a9ea8" }}>
        {DOCS.join(" · ")}
      </span>,
      <StatusBadge key="s" tone="warn">
        {row.statusLabel}
      </StatusBadge>,
      <form key="f" action={markAccountedAction} style={{ margin: 0 }}>
        <input type="hidden" name="shipmentId" value={row.shipmentId} />
        <button type="submit" style={NEXT_STAGE_BTN}>
          Documented, to warehouse →
        </button>
      </form>,
    ],
    sortValues: [
      row.orderNumber,
      row.clientName,
      row.scheduledDate,
      row.totalWeightKg,
      null,
      row.statusLabel,
      null,
    ],
  }));

  return (
    <div className="scr">
      <OpsHeader
        title="Accounting"
        breadcrumb="Operations section › ERP data"
        action={
          <ExportButton
            filename="accounting"
            headers={["Order", "Client", "Date", "Weight", "Documents", "Status"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[{ label: "All", value: "all" }]}
        metrics={[
          { value: rows.length, label: "processing", color: "var(--accent)", bordered: false },
          { value: fmtKg(totalWeightKg), label: "total weight", color: "#9a6a00", bordered: true },
          { value: DOCS.length, label: "documents per package", color: "#197a48", bordered: true },
        ]}
      />

      <DataTable
        columns={ACCOUNTING_COLUMNS}
        rows={accountingRows}
        emptyText="No orders pending processing."
      />
    </div>
  );
}
