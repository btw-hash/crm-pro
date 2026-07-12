import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { nomenclatureOptions } from "@/app/_components/nomenclature-options";
import { OpsFilters } from "@/app/_components/ops-filters";
import {
  GLASS_PANEL,
  OpsHeader,
  SectionTitle,
  StatusBadge,
  type StatusTone,
} from "@/app/_components/ops-ui";
import { DataTable, type DataColumn, type DataRow } from "@/app/_components/data-table";
import {
  DEFECT_REASON_LABELS,
  DEFECT_REASONS,
  DEFECT_STATUS_LABELS,
  isDefectReleased,
} from "@/domain/defect/defect-item";
import type { DefectStatus } from "@/domain/defect/defect-item";
import { canManageShipments } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import { advanceDefectAction, fileDefectAction } from "./actions";

/** Relabeling stage badge tone: on defect stock/request — needs action, in progress — neutral, released — success. */
const STATUS_TONE_BY_STAGE: Record<DefectStatus, StatusTone> = {
  on_defect_stock: "bad",
  relabel_requested: "warn",
  relabeling: "neu",
  ready: "warn",
  released: "ok",
};

const ADVANCE_BTN: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.6)",
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "#16181d",
  font: "600 12px Arial",
  padding: "7px 13px",
  borderRadius: "999px",
  cursor: "pointer",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};

const DEFECT_COLUMNS: DataColumn[] = [
  { label: "Product", flex: 2 },
  { label: "Qty", align: "right" },
  { label: "Reason" },
  { label: "Stage" },
  { label: "Filed by" },
  { label: "", align: "right", sortable: false },
];

const DEFECT_FILTERS: Record<string, (status: DefectStatus) => boolean> = {
  all: () => true,
  on_defect_stock: (s) => s === "on_defect_stock",
  relabeling: (s) => s === "relabel_requested" || s === "relabeling" || s === "ready",
  released: (s) => s === "released",
};

/**
 * Defect warehouse and relabeling (#127): an item in the defect warehouse → a relabeling
 * request → moved to the relabeling warehouse → ready → released. Item state + process.
 * For ops roles.
 */
export default async function DefectsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canManageShipments(user.role)) {
    redirect("/");
  }
  const [items, products] = await Promise.all([
    getContainer().listDefectItems(),
    getContainer().listProducts(),
  ]);
  const nomenclature = nomenclatureOptions(products);

  const inProcessCount = items.filter((item) => !isDefectReleased(item.status)).length;
  const releasedCount = items.filter((item) => isDefectReleased(item.status)).length;

  const filter = (await searchParams).filter ?? "all";
  const predicate = DEFECT_FILTERS[filter] ?? (() => true);
  const visibleItems = items.filter((item) => predicate(item.status));

  const exportRows = visibleItems.map((item) => [
    item.productName,
    `${item.quantity} ${item.unit}`,
    DEFECT_REASON_LABELS[item.reason],
    DEFECT_STATUS_LABELS[item.status],
    personLabel(item.createdBy),
  ]);

  const defectRows: DataRow[] = visibleItems.map((item) => ({
    id: item.id,
    cells: [
      <span key="t">
        {item.productName}
        {item.note ? (
          <>
            <br />
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{item.note}</span>
          </>
        ) : null}
      </span>,
      `${item.quantity} ${item.unit}`,
      <span key="r" style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
        {DEFECT_REASON_LABELS[item.reason]}
      </span>,
      <StatusBadge key="b" tone={STATUS_TONE_BY_STAGE[item.status]}>
        {DEFECT_STATUS_LABELS[item.status]}
      </StatusBadge>,
      <span key="c" style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
        {personLabel(item.createdBy)}
      </span>,
      isDefectReleased(item.status) ? null : (
        <form key="f" action={advanceDefectAction}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" style={ADVANCE_BTN}>
            Next stage →
          </button>
        </form>
      ),
    ],
    sortValues: [
      item.productName,
      item.quantity,
      DEFECT_REASON_LABELS[item.reason],
      DEFECT_STATUS_LABELS[item.status],
      personLabel(item.createdBy),
      null,
    ],
  }));

  return (
    <div className="scr">
      <OpsHeader
        title="Defect warehouse"
        breadcrumb="Operations section › ERP data"
        action={
          <ExportButton
            filename="defect-warehouse"
            headers={["Product", "Qty", "Reason", "Stage", "Filed by"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[
          { label: "All", value: "all" },
          { label: "In defect warehouse", value: "on_defect_stock" },
          { label: "Relabeling", value: "relabeling" },
          { label: "Released", value: "released" },
        ]}
        metrics={[
          {
            value: items.length,
            label: "items",
            color: "var(--accent)",
            bordered: false,
          },
          {
            value: inProcessCount,
            label: "in progress",
            color: "#9a6a00",
            bordered: true,
          },
          {
            value: releasedCount,
            label: "in circulation",
            color: "#197a48",
            bordered: true,
          },
        ]}
      />

      <SectionTitle style={{ margin: "0 0 6px" }}>Defect warehouse and relabeling</SectionTitle>
      <p style={{ font: "400 13px Arial", color: "#9a9ea8", margin: "0 0 12px" }}>
        Item state and the relabeling process: from the defect warehouse through relabeling back
        into circulation. Confirm each stage transition.
      </p>

      <div style={{ marginBottom: "24px" }}>
        <DataTable
          columns={DEFECT_COLUMNS}
          rows={defectRows}
          emptyText="The defect warehouse is empty."
        />
      </div>

      <SectionTitle>Add an item to the defect warehouse</SectionTitle>
      <div style={{ ...GLASS_PANEL, padding: "20px 22px" }}>
        <form
          action={fileDefectAction}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              font: "600 12px Arial",
              color: "#16181d",
            }}
          >
            Product
            <select
              name="productName"
              required
              defaultValue=""
              style={{
                border: "1px solid #e7e3dd",
                background: "rgba(255,255,255,0.65)",
                borderRadius: "12px",
                padding: "10px 13px",
                font: "500 13px Arial",
                color: "#16181d",
              }}
            >
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
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              font: "600 12px Arial",
              color: "#16181d",
            }}
          >
            Quantity
            <input
              name="quantity"
              type="number"
              min="1"
              step="any"
              required
              style={{
                border: "1px solid #e7e3dd",
                background: "rgba(255,255,255,0.65)",
                borderRadius: "12px",
                padding: "10px 13px",
                font: "500 13px Arial",
                color: "#16181d",
              }}
            />
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              font: "600 12px Arial",
              color: "#16181d",
            }}
          >
            Unit
            <select
              name="unit"
              required
              defaultValue={nomenclature.units[0] ?? "kg"}
              style={{
                border: "1px solid #e7e3dd",
                background: "rgba(255,255,255,0.65)",
                borderRadius: "12px",
                padding: "10px 13px",
                font: "500 13px Arial",
                color: "#16181d",
              }}
            >
              {nomenclature.units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              font: "600 12px Arial",
              color: "#16181d",
            }}
          >
            Reason
            <select
              name="reason"
              defaultValue="wrong_label"
              style={{
                border: "1px solid #e7e3dd",
                background: "rgba(255,255,255,0.65)",
                borderRadius: "12px",
                padding: "10px 13px",
                font: "500 13px Arial",
                color: "#16181d",
              }}
            >
              {DEFECT_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {DEFECT_REASON_LABELS[reason]}
                </option>
              ))}
            </select>
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              font: "600 12px Arial",
              color: "#16181d",
            }}
          >
            Comment
            <textarea
              name="note"
              rows={2}
              placeholder="Details"
              style={{
                border: "1px solid #e7e3dd",
                background: "rgba(255,255,255,0.65)",
                borderRadius: "12px",
                padding: "10px 13px",
                font: "500 13px Arial",
                color: "#16181d",
                resize: "vertical",
              }}
            />
          </label>
          <button
            type="submit"
            style={{
              border: "none",
              background: "#1c1f27",
              color: "#fff",
              font: "600 13px Arial",
              padding: "11px 16px",
              borderRadius: "24px",
              cursor: "pointer",
              alignSelf: "flex-start",
            }}
          >
            Add to defect warehouse
          </button>
        </form>
      </div>
    </div>
  );
}
