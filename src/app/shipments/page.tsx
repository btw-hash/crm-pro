import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { OpsFilters } from "@/app/_components/ops-filters";
import { OpsHeader, StatusBadge, type StatusTone } from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";
import { canManageShipments } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { advanceShipmentAction } from "./actions";

// Stage-advance button — a real function of the section (passive capture: a person
// confirms the shipment moving to the next stage). The presentational reference doesn't
// describe it, but per the rules we keep the functionality (a server action, not onClick).
const NEXT_STAGE_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 12px Arial",
  padding: "8px 14px",
  borderRadius: "999px",
  cursor: "pointer",
};

// Status badge tone by shipment stage: delivered — ok, cancelled — bad,
// other flow stages — neutral-warn (in progress).
function shipmentTone(status: string): StatusTone {
  if (status === "delivered") return "ok";
  if (status === "cancelled") return "bad";
  if (status === "loading" || status === "in_warehouse") return "warn";
  return "neu";
}

// A single generic table matching the reference (board 9): "# · Client · Contents · Date · Status".
// The stage-advance action is an extra column beyond the presentational reference (a real function).
const SHIPMENT_COLUMNS: DataColumn[] = [
  { label: "#" },
  { label: "Client", flex: 2 },
  { label: "Contents", flex: 2, sortable: false },
  { label: "Date" },
  { label: "Status" },
  { label: "", align: "right", sortable: false },
];

/**
 * Shipments and delivery (#128): the system builds derived documents from orders on its
 * own. The screen has been brought to a single generic table matching the reference (one
 * glass panel under a shared OpsHeader/OpsFilters) — instead of the earlier grouped
 * block panels. Data comes from the dispatch plan (`getDispatchPlan`): the daily summary
 * gives #/client/date/status, the warehouse letter gives the contents and stage
 * transitions. A person confirms each transition (passive capture).
 */
export default async function ShipmentsPage() {
  const user = await requireUser();
  if (!canManageShipments(user.role)) {
    redirect("/");
  }
  const { note, summary, schedule } = await getContainer().getDispatchPlan();

  // Shipment contents ("Contents") live in the warehouse letter — indexed by shipmentId
  // to enrich the flat list from the daily summary.
  const productsById = new Map(note.map((row) => [row.shipmentId, row.products]));
  // Active (not delivered) shipments — the ones moving through stages; we render the
  // advance button for them. The flag comes from the warehouse letter (it has status).
  const activeIds = new Set(
    note.filter((row) => row.status !== "delivered").map((r) => r.shipmentId),
  );

  // Flat list of all shipments from the daily summary — the single source for the table.
  const flatRows = summary.flatMap((day) => day.rows.map((row) => ({ ...row, date: day.date })));

  const inTransit = note.filter((row) => row.status === "loading").length;
  const delayed = note.filter((row) => row.status === "in_warehouse").length;

  const exportRows = flatRows.map((row) => [
    row.orderNumber,
    row.clientName,
    productsById.get(row.shipmentId) ?? "—",
    row.date,
    row.statusLabel,
  ]);

  const shipmentRows: DataRow[] = flatRows.map((row) => ({
    id: row.shipmentId,
    cells: [
      <span key="o" style={{ color: "#9a9ea8" }}>
        {row.orderNumber}
      </span>,
      row.clientName,
      <span key="p" style={{ color: "#9a9ea8" }}>
        {productsById.get(row.shipmentId) ?? "—"}
      </span>,
      <span key="d" style={{ color: "#9a9ea8" }}>
        {row.date}
      </span>,
      <StatusBadge key="s" tone={shipmentTone(row.status)}>
        {row.statusLabel}
      </StatusBadge>,
      activeIds.has(row.shipmentId) ? (
        <form key="f" action={advanceShipmentAction} style={{ margin: 0 }}>
          <input type="hidden" name="shipmentId" value={row.shipmentId} />
          <button type="submit" style={NEXT_STAGE_BTN}>
            Next stage →
          </button>
        </form>
      ) : null,
    ],
    sortValues: [row.orderNumber, row.clientName, null, row.date, row.statusLabel, null],
  }));

  return (
    <div className="scr">
      <OpsHeader
        title="Shipments and delivery"
        breadcrumb="Operations section › ERP data"
        action={
          <ExportButton
            filename="shipments"
            headers={["#", "Client", "Contents", "Date", "Status"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[{ label: "All", value: "all" }]}
        metrics={[
          { value: flatRows.length, label: "shipments", color: "var(--accent)", bordered: false },
          { value: inTransit, label: "in transit", color: "#9a6a00", bordered: true },
          { value: schedule.length, label: "routes", color: "#197a48", bordered: true },
          { value: delayed, label: "in prep", color: "#6b6f78", bordered: true },
        ]}
      />

      <DataTable columns={SHIPMENT_COLUMNS} rows={shipmentRows} emptyText="No shipments." />
    </div>
  );
}
