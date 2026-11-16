import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { OpsFilters } from "@/app/_components/ops-filters";
import { OpsHeader } from "@/app/_components/ops-ui";
import { makeId } from "@/domain/shared/id";
import { canSeeTechQueue } from "@/domain/shared/role";
import {
  TECH_REQUEST_KIND_LABELS,
  TECH_REQUEST_STATUS_LABELS,
} from "@/domain/tech-request/tech-request";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import { TechQueueItem } from "./_components/tech-queue-item";
import {
  filterTechRequests,
  TECH_QUEUE_FILTER_CHIPS,
  toTechQueueFilter,
} from "./_lib/tech-queue-filter";

// --- CRM Pro warm theme: shared inline styles for the operational section ---
const GLASS_PANEL: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "22px",
  padding: "8px 22px 14px",
};

const COL_HEAD: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "14px 6px 12px",
  borderBottom: "1px solid #eef0f2",
};

const COL_LABEL: React.CSSProperties = {
  flex: 1,
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
};

const EXPORT_HEADERS = ["Client", "Deal", "Type", "Note", "Created", "Status"] as const;

export default async function TechQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  // Tech queue — only the technologist and head of sales.
  if (!canSeeTechQueue(user.role)) {
    redirect("/");
  }
  const container = getContainer();
  const [activeRequests, allDeals, allClients] = await Promise.all([
    container.listOpenTechRequests(),
    container.listDeals(user),
    container.listClients(user),
  ]);

  const dealMap = new Map(allDeals.map((d) => [d.id, d]));
  const clientMap = new Map(allClients.map((c) => [c.id, c]));

  // Metrics are computed over all active requests (overall totals, filter-independent).
  const openCount = activeRequests.filter((r) => r.status === "open").length;
  const inProgressCount = activeRequests.filter((r) => r.status === "in_progress").length;
  const demoCount = activeRequests.filter((r) => r.kind === "demo").length;

  const filter = toTechQueueFilter((await searchParams).filter);
  const visibleRequests = filterTechRequests(activeRequests, filter);

  const exportRows = visibleRequests.map((req) => [
    clientMap.get(makeId(req.clientId))?.name ?? req.clientId,
    dealMap.get(makeId(req.dealId))?.title ?? req.dealId,
    TECH_REQUEST_KIND_LABELS[req.kind],
    req.note,
    new Date(req.createdAt).toLocaleString("en-US", {
      timeZone: "America/New_York",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    TECH_REQUEST_STATUS_LABELS[req.status],
  ]);

  return (
    <div className="scr">
      <OpsHeader
        title="Tech queue"
        breadcrumb="Operations section › ERP data"
        action={<ExportButton filename="tech-queue" headers={EXPORT_HEADERS} rows={exportRows} />}
      />

      <OpsFilters
        chips={[...TECH_QUEUE_FILTER_CHIPS]}
        metrics={[
          { value: openCount, label: "open", color: "var(--accent)", bordered: false },
          { value: inProgressCount, label: "in progress", color: "#9a6a00", bordered: true },
          { value: demoCount, label: "demo", color: "#197a48", bordered: true },
        ]}
      />

      {visibleRequests.length === 0 ? (
        <div style={{ ...GLASS_PANEL, padding: "26px 22px" }}>
          <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
            {activeRequests.length === 0 ? "No active requests." : "No requests match this filter."}
          </span>
        </div>
      ) : (
        <div className="r-table" style={GLASS_PANEL}>
          <div style={COL_HEAD}>
            {/* Chevron — a decorative navigation column (reference :812, empty header) */}
            <span style={{ flex: "0 0 16px" }} />
            <span style={{ ...COL_LABEL, flex: "0 0 52px" }}>Request</span>
            <span style={{ ...COL_LABEL, flex: 2, minWidth: 0 }}>Client</span>
            <span style={{ ...COL_LABEL, flex: 2, minWidth: 0 }}>Type</span>
            <span style={COL_LABEL}>Created</span>
            <span style={COL_LABEL}>Deadline</span>
            <span style={{ ...COL_LABEL, flex: "0 0 96px" }}>Status</span>
            {/* Action column — no text label (reference :819) */}
            <span style={{ flex: "0 0 132px" }} />
          </div>
          {visibleRequests.map((req) => {
            const deal = dealMap.get(makeId(req.dealId));
            const client = clientMap.get(makeId(req.clientId));
            return (
              <TechQueueItem
                key={req.id}
                req={req}
                dealTitle={deal?.title ?? req.dealId}
                clientName={client?.name ?? req.clientId}
                managerName={personLabel(req.requestedBy)}
                assignedToName={req.assignedTo ? personLabel(req.assignedTo) : null}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
