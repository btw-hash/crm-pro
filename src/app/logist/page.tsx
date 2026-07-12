import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { OpsFilters } from "@/app/_components/ops-filters";
import { OpsHeader, StatusBadge } from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";
import { canAccessLoadingStage } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { markDeliveredAction } from "./actions";

function fmtKg(kg: number): string {
  return `${kg.toLocaleString("en-US")} kg`;
}

// "Truck left" button — a real feature of this section (logistics marks
// departure, loading → delivered). The presentational reference doesn't
// describe it, but per the rules we keep the functionality (a server action
// on the server page, not onClick).
const DELIVER_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 12px Arial",
  padding: "8px 14px",
  borderRadius: "999px",
  cursor: "pointer",
};

// The reference's shared generic table (board 12). The reference's semantic
// columns are "Route · Truck · Stops · Driver · Status"; our data source is a
// queue of individual orders on loading (no route aggregation), so the columns
// come from real shipment data: "Order · Client · Address · Date · Truck · Weight · Status".
const LOGIST_COLUMNS: DataColumn[] = [
  { label: "Order" },
  { label: "Client", flex: 2 },
  { label: "Address", flex: 2 },
  { label: "Date" },
  { label: "Truck" },
  { label: "Weight", align: "right" },
  { label: "Status" },
  { label: "", align: "right", sortable: false },
];

const LOGIST_FILTERS: Record<string, (driver: string | null) => boolean> = {
  all: () => true,
  assigned: (d) => d !== null,
  no_driver: (d) => d === null,
};

/**
 * Logistics section (#215): shipments at the loading/delivery stage. Logistics
 * sees their queue and marks departure (loading → delivered). Brought to the
 * reference's shared generic table: one glass table panel right under
 * OpsHeader/OpsFilters, with no intermediate section heading or explanatory paragraph.
 */
export default async function LogistPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canAccessLoadingStage(user.role)) {
    redirect("/");
  }

  const rows = await getContainer().listLoadingShipments();

  const totalWeightKg = rows.reduce((sum, r) => sum + r.totalWeightKg, 0);
  const withDriver = rows.filter((r) => r.driver !== null).length;
  const withoutDriver = rows.length - withDriver;

  const filter = (await searchParams).filter ?? "all";
  const predicate = LOGIST_FILTERS[filter] ?? (() => true);
  const visibleRows = rows.filter((r) => predicate(r.driver));

  const exportRows = visibleRows.map((row) => [
    row.orderNumber,
    row.clientName,
    row.address,
    row.scheduledDate,
    row.driver ?? "not assigned",
    fmtKg(row.totalWeightKg),
  ]);

  const logistRows: DataRow[] = visibleRows.map((row) => {
    const hasDriver = row.driver !== null;
    return {
      id: row.shipmentId,
      cells: [
        <span key="o" style={{ color: "#9a9ea8" }}>
          {row.orderNumber}
        </span>,
        row.clientName,
        <span key="a" style={{ color: "#9a9ea8" }}>
          {row.address}
        </span>,
        <span key="d" style={{ color: "#9a9ea8" }}>
          {row.scheduledDate}
        </span>,
        <StatusBadge key="b" tone={hasDriver ? "ok" : "warn"}>
          {row.driver ?? "not assigned"}
        </StatusBadge>,
        <span key="w" style={{ fontWeight: 700 }}>
          {fmtKg(row.totalWeightKg)}
        </span>,
        <StatusBadge key="s" tone={hasDriver ? "neu" : "warn"}>
          {row.statusLabel}
        </StatusBadge>,
        <form key="f" action={markDeliveredAction} style={{ margin: 0 }}>
          <input type="hidden" name="shipmentId" value={row.shipmentId} />
          <button type="submit" style={DELIVER_BTN}>
            Truck left →
          </button>
        </form>,
      ],
      sortValues: [
        row.orderNumber,
        row.clientName,
        row.address,
        row.scheduledDate,
        row.driver ?? "not assigned",
        row.totalWeightKg,
        row.statusLabel,
        null,
      ],
    };
  });

  return (
    <div className="scr">
      <OpsHeader
        title="Loading & delivery"
        breadcrumb="Operations section › ERP data"
        action={
          <ExportButton
            filename="loading-delivery"
            headers={["Order", "Client", "Address", "Date", "Truck", "Weight"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[
          { label: "All", value: "all" },
          { label: "Truck assigned", value: "assigned" },
          { label: "No truck", value: "no_driver" },
        ]}
        metrics={[
          { value: rows.length, label: "loading", color: "var(--accent)", bordered: false },
          { value: withoutDriver, label: "no truck", color: "#9a6a00", bordered: true },
          { value: fmtKg(totalWeightKg), label: "to deliver", color: "#197a48", bordered: true },
        ]}
      />

      <DataTable columns={LOGIST_COLUMNS} rows={logistRows} emptyText="No orders at loading." />
    </div>
  );
}
