import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { OpsFilters } from "@/app/_components/ops-filters";
import { GLASS_PANEL, OpsHeader, statusBadgeStyle } from "@/app/_components/ops-ui";
import { canViewMyShipments } from "@/domain/shared/role";
import {
  SHIPMENT_STATUS_FLOW,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
} from "@/domain/shipment/shipment";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { MyShipmentFilters } from "./my-shipment-filters";

const STATUS_STEP: Record<string, number> = Object.fromEntries(
  SHIPMENT_STATUS_FLOW.map((s, i) => [s, i]),
);

// "My shipments" table layout per the design reference (CRM-PRO.dc.html:1641-1642):
// 7 fixed columns Order · Client · Address · Date · Truck · Stage · Progress.
const MY_SHIPMENT_GRID =
  "118px minmax(150px,1.3fr) minmax(170px,1.5fr) 120px 150px 156px minmax(150px,1.3fr)";
const MY_SHIPMENT_HEADS = [
  "Order",
  "Client",
  "Address",
  "Shipment date",
  "Truck",
  "Stage",
  "Progress",
];

const HEAD_ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: MY_SHIPMENT_GRID,
  alignItems: "center",
  gap: "12px",
  padding: "13px 8px 11px",
  borderBottom: "1px solid #e8e1d9",
};

const HEAD_CELL: CSSProperties = {
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
};

const BODY_ROW: CSSProperties = {
  display: "grid",
  gridTemplateColumns: MY_SHIPMENT_GRID,
  alignItems: "center",
  gap: "12px",
  padding: "12px 8px",
  borderBottom: "1px solid #f0ebe4",
};

// "My shipments" filter: status groups for the chips (preparing/in transit/delivered/cancelled).
const MY_SHIPMENT_FILTERS: Record<string, (status: ShipmentStatus) => boolean> = {
  all: () => true,
  preparing: (s) => s === "placed" || s === "in_accounting" || s === "in_warehouse",
  transit: (s) => s === "loading",
  delivered: (s) => s === "delivered",
  cancelled: (s) => s === "cancelled",
};

/**
 * "My shipments" — owner-scoped status tracking for a manager (#215).
 * A manager places an order → the system hands it off to the operations
 * loop; here the manager sees what stage each of their orders is at.
 */
export default async function MyShipmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; client?: string; date?: string }>;
}) {
  const user = await requireUser();
  if (!canViewMyShipments(user.role)) {
    redirect("/");
  }

  const rows = await getContainer().listMyShipments({ managerId: user.id });

  const total = rows.length;
  const active = rows.filter((r) => r.status !== "delivered" && r.status !== "cancelled").length;
  const delivered = rows.filter((r) => r.status === "delivered").length;

  // This manager's clients — for the dropdown filter (unique, alphabetical).
  const clientNames = [...new Set(rows.map((r) => r.clientName))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );

  const sp = await searchParams;
  const filter = sp.filter ?? "all";
  const clientFilter = sp.client ?? "";
  const dateFilter = sp.date ?? "";
  const predicate = MY_SHIPMENT_FILTERS[filter] ?? (() => true);
  const visibleRows = rows.filter(
    (r) =>
      predicate(r.status) &&
      (clientFilter === "" || r.clientName === clientFilter) &&
      (dateFilter === "" || r.scheduledDate === dateFilter),
  );

  const exportRows = visibleRows.map((row) => [
    row.orderNumber,
    row.clientName,
    row.address,
    row.scheduledDate,
    row.driver ?? "— not assigned —",
    row.statusLabel,
  ]);

  const stepsTotal = SHIPMENT_STATUS_FLOW.length - 1;

  return (
    <div className="scr">
      <OpsHeader
        title="My shipments"
        breadcrumb="Operations section › my orders in the ERP"
        action={
          <ExportButton
            filename="my-shipments"
            headers={["Order", "Client", "Address", "Shipment date", "Truck", "Stage"]}
            rows={exportRows}
          />
        }
      />

      {rows.length === 0 ? (
        <div style={GLASS_PANEL}>
          <p style={{ font: "400 13px Arial", color: "#9a9ea8", margin: "14px 6px" }}>
            You don&apos;t have any shipments yet.
          </p>
        </div>
      ) : (
        <>
          <OpsFilters
            label="STATUS"
            chips={[
              { label: "All", value: "all" },
              { label: "Preparing", value: "preparing" },
              { label: "In transit", value: "transit" },
              { label: "Delivered", value: "delivered" },
              { label: "Cancelled", value: "cancelled" },
            ]}
            metrics={[
              { value: total, label: "total orders", color: "#16181d", bordered: false },
              { value: active, label: "active", color: "#9a6a00", bordered: true },
              { value: delivered, label: "delivered", color: "#197a48", bordered: true },
            ]}
          />

          <MyShipmentFilters clients={clientNames} />

          <div style={{ font: "600 13px Arial", color: "#16181d", margin: "0 0 4px" }}>
            Order statuses
          </div>
          <p
            style={{
              font: "400 13px Arial",
              color: "#9a9ea8",
              margin: "0 0 14px",
              maxWidth: "780px",
              lineHeight: 1.5,
            }}
          >
            Orders you placed. The system hands them off to the operations loop — the current stage
            is shown here. Stages:{" "}
            <b style={{ color: "#6b6f78" }}>
              {SHIPMENT_STATUS_FLOW.map((s) => SHIPMENT_STATUS_LABELS[s]).join(" → ")}
            </b>
            .
          </p>

          {visibleRows.length === 0 ? (
            <div style={{ font: "400 13px Arial", color: "#9a9ea8", padding: "16px 4px" }}>
              Nothing matches this filter.
            </div>
          ) : (
            <div style={{ ...GLASS_PANEL, padding: "6px 18px 12px", overflowX: "auto" }}>
              <div style={{ minWidth: "1080px" }}>
                <div style={HEAD_ROW}>
                  {MY_SHIPMENT_HEADS.map((label) => (
                    <span key={label} style={HEAD_CELL}>
                      {label}
                    </span>
                  ))}
                </div>

                {visibleRows.map((row) => {
                  const isCancelled = row.status === "cancelled";
                  const isDone = row.status === "delivered";
                  const step = isCancelled ? 0 : (STATUS_STEP[row.status] ?? 0);
                  const pct = Math.round((step / stepsTotal) * 100);

                  return (
                    <div key={row.shipmentId} style={BODY_ROW}>
                      <span style={{ font: "600 12px Arial", color: "#9a9ea8" }}>
                        {row.orderNumber}
                      </span>
                      <span style={{ font: "600 13px Arial", color: "#16181d" }}>
                        {row.clientName}
                      </span>
                      <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
                        {row.address}
                      </span>
                      <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
                        {row.scheduledDate}
                      </span>
                      <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
                        {row.driver ?? "— not assigned —"}
                      </span>
                      <span>
                        <span
                          style={statusBadgeStyle(isCancelled ? "bad" : isDone ? "ok" : "warn")}
                        >
                          {row.statusLabel}
                        </span>
                      </span>
                      {isCancelled ? (
                        <span style={{ font: "600 12px Arial", color: "#9a9ea8" }}>
                          — cancelled —
                        </span>
                      ) : (
                        <span
                          style={{ display: "flex", alignItems: "center", gap: "8px" }}
                          title={`${pct}%`}
                        >
                          <span style={{ display: "inline-flex", gap: "3px" }}>
                            {SHIPMENT_STATUS_FLOW.map((s) => (
                              <span
                                key={s}
                                title={SHIPMENT_STATUS_LABELS[s]}
                                style={{
                                  display: "inline-block",
                                  width: 10,
                                  height: 10,
                                  borderRadius: "50%",
                                  background:
                                    (STATUS_STEP[s] ?? 0) <= step
                                      ? isDone
                                        ? "#197a48"
                                        : "var(--accent)"
                                      : "#e3e8ee",
                                }}
                              />
                            ))}
                          </span>
                          <span
                            style={{
                              font: "700 12px Arial",
                              color: isDone ? "#197a48" : "#9a6a00",
                            }}
                          >
                            {pct}%
                          </span>
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
