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
import { isPackingDone, PACKING_STATUS_LABELS } from "@/domain/packing/packing-request";
import type { PackingStatus } from "@/domain/packing/packing-request";
import { canManageShipments } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import { advancePackingAction, filePackingAction } from "./actions";

/** Badge tone by request stage: created → in progress → done. */
function packingTone(status: string): StatusTone {
  if (status === "done") {
    return "ok";
  }
  if (status === "in_progress") {
    return "warn";
  }
  return "neu";
}

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

const PACK_COLUMNS: DataColumn[] = [
  { label: "Product" },
  { label: "Packing" },
  { label: "Qty", align: "right" },
  { label: "Client / requester", flex: 1.4 },
  { label: "Stage" },
  { label: "", align: "right", sortable: false },
];

const PACKING_FILTERS: Record<string, (status: PackingStatus) => boolean> = {
  all: () => true,
  requested: (s) => s === "requested",
  in_progress: (s) => s === "in_progress",
  done: (s) => s === "done",
};

const FIELD_LABEL: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
};

const FIELD_INPUT: React.CSSProperties = {
  border: "1px solid rgba(120,130,150,0.22)",
  background: "rgba(255,255,255,0.7)",
  borderRadius: "12px",
  padding: "10px 12px",
  font: "500 13px Arial",
  color: "#16181d",
};

/**
 * Packing queue (#126): a manager sees a product that needs repacking → a
 * request to the packer (source → target packing). Section for operations roles.
 */
export default async function PackingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canManageShipments(user.role)) {
    redirect("/");
  }
  const [requests, clients, products] = await Promise.all([
    getContainer().listPackingRequests(),
    getContainer().listClients({ id: user.id, role: "head" }),
    getContainer().listProducts(),
  ]);
  const clientName = new Map(clients.map((c) => [c.id, c.name]));
  const nomenclature = nomenclatureOptions(products);

  const doneCount = requests.filter((r) => isPackingDone(r.status)).length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;

  const filter = (await searchParams).filter ?? "all";
  const predicate = PACKING_FILTERS[filter] ?? (() => true);
  const visibleRequests = requests.filter((r) => predicate(r.status));

  const exportRows = visibleRequests.map((req) => [
    req.productName,
    `${req.sourcePack} → ${req.targetPack}`,
    req.quantity,
    req.unit,
    req.clientId ? (clientName.get(req.clientId) ?? "") : "",
    personLabel(req.requestedBy),
    PACKING_STATUS_LABELS[req.status],
  ]);

  const packRows: DataRow[] = visibleRequests.map((req) => {
    const done = isPackingDone(req.status);
    return {
      id: req.id,
      faded: done,
      cells: [
        req.productName,
        <span key="p">
          {req.sourcePack} → <strong>{req.targetPack}</strong>
        </span>,
        `${req.quantity} ${req.unit}`,
        <span key="c" style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
          {req.clientId ? `${clientName.get(req.clientId) ?? "—"} · ` : ""}
          {personLabel(req.requestedBy)}
        </span>,
        <StatusBadge key="b" tone={packingTone(req.status)}>
          {PACKING_STATUS_LABELS[req.status]}
        </StatusBadge>,
        done ? null : (
          <form key="f" action={advancePackingAction} style={{ display: "inline" }}>
            <input type="hidden" name="id" value={req.id} />
            <button type="submit" style={ADVANCE_BTN}>
              Next stage →
            </button>
          </form>
        ),
      ],
      sortValues: [
        req.productName,
        req.targetPack,
        req.quantity,
        personLabel(req.requestedBy),
        PACKING_STATUS_LABELS[req.status],
        null,
      ],
    };
  });

  return (
    <div className="scr">
      <OpsHeader
        title="Packing requests"
        breadcrumb="Operations section › packing queue"
        action={
          <ExportButton
            filename="packing"
            headers={["Product", "Packing", "Qty", "Unit", "Client", "Requester", "Stage"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        chips={[
          { label: "All", value: "all" },
          { label: "Queued", value: "requested" },
          { label: "In progress", value: "in_progress" },
          { label: "Done", value: "done" },
        ]}
        metrics={[
          { value: requests.length, label: "requests", color: "var(--accent)", bordered: false },
          { value: inProgressCount, label: "in progress", color: "#9a6a00", bordered: true },
          { value: doneCount, label: "done", color: "#197a48", bordered: true },
        ]}
      />

      <p style={{ font: "400 13px Arial", color: "#9a9ea8", margin: "0 0 12px" }}>
        Packing queue: what to repack and from which packing into which. A manager files a request —
        the packer works through the stages.
      </p>

      <div style={{ marginBottom: "24px" }}>
        <DataTable columns={PACK_COLUMNS} rows={packRows} emptyText="No packing requests." />
      </div>

      <SectionTitle>New packing request</SectionTitle>
      <div style={GLASS_PANEL}>
        <form
          action={filePackingAction}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "16px",
            alignItems: "end",
            padding: "16px 6px",
          }}
        >
          <label style={FIELD_LABEL}>
            Product
            <select name="productName" required defaultValue="" style={FIELD_INPUT}>
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
          <label style={FIELD_LABEL}>
            Source packing
            <select name="sourcePack" required defaultValue="" style={FIELD_INPUT}>
              <option value="" disabled>
                — packing (ERP) —
              </option>
              {nomenclature.packagings.map((pack) => (
                <option key={pack} value={pack}>
                  {pack}
                </option>
              ))}
            </select>
          </label>
          <label style={FIELD_LABEL}>
            Target packing
            <select name="targetPack" required defaultValue="" style={FIELD_INPUT}>
              <option value="" disabled>
                — packing (ERP) —
              </option>
              {nomenclature.packagings.map((pack) => (
                <option key={pack} value={pack}>
                  {pack}
                </option>
              ))}
            </select>
          </label>
          <label style={FIELD_LABEL}>
            Quantity
            <input name="quantity" type="number" min="1" step="any" required style={FIELD_INPUT} />
          </label>
          <label style={FIELD_LABEL}>
            Unit
            <select
              name="unit"
              required
              defaultValue={nomenclature.units[0] ?? "kg"}
              style={FIELD_INPUT}
            >
              {nomenclature.units.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            style={{
              border: "none",
              background: "#1c1f27",
              color: "#fff",
              font: "600 13px Arial",
              padding: "12px 18px",
              borderRadius: "12px",
              cursor: "pointer",
            }}
          >
            Create request
          </button>
        </form>
      </div>
    </div>
  );
}
