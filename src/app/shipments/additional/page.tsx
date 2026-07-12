import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { nomenclatureOptions } from "@/app/_components/nomenclature-options";
import { OpsFilters } from "@/app/_components/ops-filters";
import { GLASS_PANEL, OpsHeader, SectionTitle, StatusBadge } from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";
import {
  type AdditionalOrder,
  additionalOrderLinesSummary,
} from "@/domain/shipment/additional-order";
import { canFileAdditionalOrder } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import { fileAdditionalOrderAction } from "./actions";

const TODAY = new Date().toISOString().slice(0, 10);

const ADDITIONAL_FILTERS: Record<string, (order: AdditionalOrder) => boolean> = {
  all: () => true,
  with_note: (o) => o.note !== null,
};

const ADDITIONAL_COLUMNS: DataColumn[] = [
  { label: "Parent request", flex: 1.4 },
  { label: "Client" },
  { label: "Line items", flex: 2, sortable: false },
  { label: "Logged by" },
  { label: "Time", align: "right" },
  { label: "Note", flex: 1.6, sortable: false },
];

// --- Warm inline styles for the add-on request form ---
const FIELD_LABEL: React.CSSProperties = {
  display: "block",
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
  marginBottom: "6px",
};

const FIELD_CONTROL: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(120,130,150,0.22)",
  background: "rgba(255,255,255,0.7)",
  borderRadius: "12px",
  padding: "10px 12px",
  font: "500 13px Arial",
  color: "#16181d",
  outline: "none",
};

/**
 * Add-on requests outside business hours (#217): a manager logs line items the client
 * added late in the evening / early in the morning, and links them to a request already
 * placed the same day. The warehouse picks them up — the shipment goes out on time.
 */
export default async function AdditionalOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canFileAdditionalOrder(user.role)) {
    redirect("/");
  }

  const container = getContainer();
  const [todayOrders, clients, products] = await Promise.all([
    container.listAdditionalOrdersByDate(TODAY),
    container.listClients({ id: user.id, role: "head" }),
    container.listProducts(),
  ]);
  const nomenclature = nomenclatureOptions(products);

  const clientName = new Map(clients.map((c) => [c.id, c.name]));

  const filter = (await searchParams).filter ?? "all";
  const predicate = ADDITIONAL_FILTERS[filter] ?? (() => true);
  const visibleOrders = todayOrders.filter((o) => predicate(o));

  const exportRows = visibleOrders.map((order) => [
    order.parentOrderNumber,
    clientName.get(order.clientId) ?? order.clientId,
    additionalOrderLinesSummary(order),
    personLabel(order.recordedBy),
    order.shipmentDate,
    order.note ?? "",
  ]);

  const tableRows: DataRow[] = visibleOrders.map((order) => ({
    id: order.id,
    cells: [
      <span key="p" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <StatusBadge tone="warn">add-on</StatusBadge>
        <strong style={{ font: "600 13px Arial", color: "#16181d" }}>
          {order.parentOrderNumber}
        </strong>
      </span>,
      clientName.get(order.clientId) ?? order.clientId,
      <span key="l" style={{ font: "400 12px Arial", color: "#6a5f54" }}>
        {additionalOrderLinesSummary(order)}
      </span>,
      <span key="r" style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
        {personLabel(order.recordedBy)}
      </span>,
      <span key="t" style={{ font: "500 12px Arial", color: "#6a5f54" }}>
        {new Date(order.createdAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>,
      <span key="n" style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
        {order.note ?? "—"}
      </span>,
    ],
    sortValues: [
      order.parentOrderNumber,
      clientName.get(order.clientId) ?? order.clientId,
      null,
      personLabel(order.recordedBy),
      order.createdAt,
      null,
    ],
  }));

  return (
    <div className="scr">
      <OpsHeader
        title="Add-on requests outside business hours"
        breadcrumb="Operations section › ERP data"
        action={
          <ExportButton
            filename="add-on-requests"
            headers={[
              "Parent request",
              "Client",
              "Line items",
              "Logged by",
              "Shipment date",
              "Note",
            ]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[
          { label: "All", value: "all" },
          { label: "With a note", value: "with_note" },
        ]}
        metrics={[
          {
            value: todayOrders.length,
            label: "add-on requests today",
            color: "var(--accent)",
            bordered: false,
          },
          {
            value: clients.length,
            label: "clients on file",
            color: "#9a6a00",
            bordered: true,
          },
          {
            value: TODAY,
            label: "business day",
            color: "#197a48",
            bordered: true,
          },
        ]}
      />

      <p
        style={{ font: "400 13px Arial", color: "#9a9ea8", margin: "0 0 16px", maxWidth: "680px" }}
      >
        A client added to their order after business hours ended — log the line items and link them
        to the existing request. The warehouse picks them up, the shipment goes out the same day.
      </p>

      <SectionTitle>Log an add-on request</SectionTitle>
      <form action={fileAdditionalOrderAction} style={{ ...GLASS_PANEL, marginBottom: "24px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            padding: "14px 0",
          }}
        >
          <label style={{ margin: 0 }}>
            <span style={FIELD_LABEL}>Client</span>
            <select name="clientId" required style={FIELD_CONTROL}>
              <option value="">— select a client —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ margin: 0 }}>
            <span style={FIELD_LABEL}>Parent request #</span>
            <input
              name="parentOrderNumber"
              required
              placeholder="E.g. SO-2026-0006"
              style={FIELD_CONTROL}
            />
          </label>
          <label style={{ margin: 0 }}>
            <span style={FIELD_LABEL}>Shipment date (same as parent)</span>
            <input
              name="shipmentDate"
              type="date"
              required
              defaultValue={TODAY}
              style={FIELD_CONTROL}
            />
          </label>
        </div>

        <fieldset style={{ border: "none", padding: 0, margin: "6px 0 0" }}>
          <legend
            style={{
              font: "600 11px Arial",
              color: "#9a9ea8",
              letterSpacing: ".5px",
              padding: 0,
              marginBottom: "8px",
            }}
          >
            ADD-ON REQUEST LINE ITEMS
          </legend>
          <div
            className="additional-line-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto",
              gap: "10px",
              alignItems: "end",
            }}
          >
            <label style={{ margin: 0 }}>
              <span style={FIELD_LABEL}>Item</span>
              <select name="productName" required defaultValue="" style={FIELD_CONTROL}>
                <option value="" disabled>
                  — from the ERP catalog —
                </option>
                {nomenclature.names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ margin: 0 }}>
              <span style={FIELD_LABEL}>Qty</span>
              <input
                name="quantity"
                type="number"
                min="0.001"
                step="any"
                required
                style={{ ...FIELD_CONTROL, width: "7rem" }}
              />
            </label>
            <label style={{ margin: 0 }}>
              <span style={FIELD_LABEL}>Unit</span>
              <select
                name="unit"
                required
                defaultValue={nomenclature.units[0] ?? "kg"}
                style={{ ...FIELD_CONTROL, width: "5rem" }}
              >
                {nomenclature.units.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        <label style={{ display: "block", margin: "14px 0 0" }}>
          <span style={FIELD_LABEL}>Note</span>
          <textarea
            name="note"
            rows={2}
            placeholder="Urgent, client called at 11pm"
            style={{ ...FIELD_CONTROL, resize: "vertical", font: "500 13px Arial" }}
          />
        </label>

        <button
          type="submit"
          style={{
            border: "none",
            background: "#1c1f27",
            color: "#fff",
            font: "600 13px Arial",
            padding: "11px 18px",
            borderRadius: "24px",
            cursor: "pointer",
            marginTop: "16px",
          }}
        >
          Log add-on request
        </button>
      </form>

      <SectionTitle style={{ margin: "0 0 6px" }}>Add-on requests today</SectionTitle>
      <p style={{ font: "400 13px Arial", color: "#9a9ea8", margin: "0 0 12px" }}>
        Logged for <strong>{TODAY}</strong>. Each one is linked to a parent request — the warehouse
        picks up the line items for the same shipment.
      </p>

      <DataTable
        columns={ADDITIONAL_COLUMNS}
        rows={tableRows}
        emptyText="No add-on requests today."
      />
    </div>
  );
}
