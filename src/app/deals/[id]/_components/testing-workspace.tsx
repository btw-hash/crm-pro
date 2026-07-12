import type { ReactNode } from "react";
import type { SectionVisibility } from "@/domain/deal/deal-stage";
import {
  TECH_REQUEST_KIND_LABELS,
  TECH_REQUEST_STATUS_LABELS,
  type TechRequest,
} from "@/domain/tech-request/tech-request";
import {
  TEST_ACT_KIND_LABELS,
  TEST_ACT_RESULT_LABELS,
  type TestAct,
} from "@/domain/test-act/test-act";

// ── palette tokens ─────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.7)",
  borderRadius: 14,
  padding: 16,
};

// ── icons ──────────────────────────────────────────────────────────

function ClockIcon(): ReactNode {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#9a9ea8"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function FileIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

// ── result chip ────────────────────────────────────────────────────

function ResultChip({ result }: { result: TestAct["result"] }): ReactNode {
  const isSuccess = result === "success";
  const isPartial = result === "partial";
  const bg = isSuccess ? "#e7f5ee" : isPartial ? "#fbf1d6" : "#fdecea";
  const color = isSuccess ? "#197a48" : isPartial ? "#9a6a00" : "#bf322b";
  return (
    <span
      style={{
        flex: "none",
        background: bg,
        color,
        font: "600 11px Arial",
        padding: "4px 10px",
        borderRadius: 999,
      }}
    >
      {TEST_ACT_RESULT_LABELS[result]}
    </span>
  );
}

// ── workup act card (Workup act) ────────────────────────────────

function StackedField({ label, value }: { label: string; value: string }): ReactNode {
  return (
    <div>
      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 2 }}>{label}</div>
      <div style={{ font: "500 14px/1.4 Arial", color: "#16181d" }}>{value}</div>
    </div>
  );
}

function WorkupActCard({ act }: { act: TestAct }): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {act.equipment ? <StackedField label="Equipment" value={act.equipment} /> : null}
      {(act.productName || act.dosage) && (
        <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
          {act.productName ? <StackedField label="Product" value={act.productName} /> : null}
          {act.dosage ? <StackedField label="Dosage" value={act.dosage} /> : null}
        </div>
      )}
      {act.processParams ? (
        <StackedField label="Process parameters" value={act.processParams} />
      ) : null}
    </div>
  );
}

// ── consult summary card (Consultation summary) ───────────────────────

function ConsultSummaryCard({ act }: { act: TestAct }): ReactNode {
  return act.recommendation ? (
    <p style={{ font: "400 13px/1.5 Arial", color: "#16181d", margin: 0 }}>{act.recommendation}</p>
  ) : null;
}

// ── audit summary card (Audit summary) ───────────────────────

function AuditSummaryCard({ act }: { act: TestAct }): ReactNode {
  const rows: [string, string | null][] = [
    ["What was checked", act.auditChecked],
    ["Remarks", act.auditRemarks],
    ["Recommendations", act.auditRecommendation],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {rows
        .filter(([, v]) => v)
        .map(([label, value]) => (
          <div key={label} style={{ display: "flex", gap: 8 }}>
            <span style={{ font: "500 12px Arial", color: "#9a9ea8", minWidth: 120 }}>{label}</span>
            <span style={{ font: "400 12px Arial", color: "#16181d" }}>{value}</span>
          </div>
        ))}
    </div>
  );
}

// ── single act document block ───────────────────────────────────────

function ActDocBlock({ act, index }: { act: TestAct; index: number }): ReactNode {
  const date = new Date(act.confirmedAt).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const title =
    act.actKind === "workup" ? `Workup act #${index + 1}` : TEST_ACT_KIND_LABELS[act.actKind];
  return (
    <div
      data-testid="act-doc-block"
      style={{
        ...CARD,
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            width: 32,
            height: 32,
            flex: "none",
            borderRadius: 9,
            background: "#eef0f2",
            color: "#6b6f78",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FileIcon />
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ font: "600 13px Arial", color: "#16181d" }}>{title}</div>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>{date}</div>
        </div>
        <ResultChip result={act.result} />
      </div>

      {/* body by kind */}
      {act.actKind === "workup" && <WorkupActCard act={act} />}
      {act.actKind === "consult_summary" && <ConsultSummaryCard act={act} />}
      {act.actKind === "audit_summary" && <AuditSummaryCard act={act} />}

      {/* comment */}
      {act.comment ? (
        <p style={{ font: "400 12px Arial", color: "#6b6f78", margin: 0 }}>{act.comment}</p>
      ) : null}
    </div>
  );
}

// ── "Technologist sent a response" header ────────────────────────────────

function TechResponseHeader({
  act,
  labelFor,
}: {
  act: TestAct;
  labelFor: (id: string) => string;
}): ReactNode {
  const sentDate = act.sentAt
    ? new Date(act.sentAt).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
    : null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        marginBottom: 4,
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          flex: "none",
          borderRadius: 9,
          background: "#e7f5ee",
          color: "#197a48",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CheckIcon />
      </span>
      <div>
        <div style={{ font: "600 13px Arial", color: "#16181d" }}>Technologist sent a response</div>
        <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>
          {labelFor(act.confirmedBy)}
          {sentDate ? ` · ${sentDate}` : ""}
        </div>
      </div>
    </div>
  );
}

// ── tech-request timeline ───────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── main exported component ─────────────────────────────────────────

export type TestingWorkspaceProps = {
  dealId: string;
  clientId: string;
  dealTitle: string;
  visibility: SectionVisibility;
  testAct: TestAct | null;
  /** All acts for the deal (there can be several kinds). */
  testActs: readonly TestAct[];
  dealTechRequests: TechRequest[];
  labelFor: (id: string) => string;
};

/**
 * Workspace for the "Tech response" stage — READ-ONLY for the manager.
 *
 * Empty state: "Awaiting technologist response" (clock icon).
 * Filled state: "Technologist sent a response" card + acts (from tech-queue).
 * The manager's old manual act form was removed — the technologist fills in the act (#461).
 */
export function TestingWorkspace({
  testActs,
  dealTechRequests,
  labelFor,
}: TestingWorkspaceProps): ReactNode {
  // Acts sent by the technologist (sentAt != null) — shown to the manager.
  const sentActs = testActs.filter((a) => a.sentAt !== null);
  const hasResponse = sentActs.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── (a) empty state / technologist response ─────────────────── */}
      {!hasResponse ? (
        <div
          data-testid="awaiting-response"
          style={{
            ...CARD,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            padding: "28px 20px",
            textAlign: "center",
          }}
        >
          <ClockIcon />
          <p style={{ font: "600 14px Arial", color: "#16181d", margin: 0 }}>
            Awaiting technologist response
          </p>
          <p style={{ font: "400 13px/1.5 Arial", color: "#9a9ea8", margin: 0 }}>
            The request has been passed to the technologist. Their results will appear here — workup
            acts, consultation summaries, and audit summaries.
          </p>
        </div>
      ) : (
        <div
          data-testid="tech-response"
          style={{ display: "flex", flexDirection: "column", gap: 10 }}
        >
          {sentActs[0] ? <TechResponseHeader act={sentActs[0]} labelFor={labelFor} /> : null}
          {sentActs.map((act, i) => (
            <ActDocBlock key={act.id} act={act} index={i} />
          ))}
        </div>
      )}

      {/* ── (b) timeline of tech requests for this deal ──────────────── */}
      {dealTechRequests.length > 0 ? (
        <ul className="timeline" style={{ marginTop: 4 }}>
          {dealTechRequests.map((req) => (
            <li key={req.id} className="timeline__item">
              <span className="badge">{TECH_REQUEST_STATUS_LABELS[req.status]}</span>
              <div className="timeline__body">
                <p>
                  {TECH_REQUEST_KIND_LABELS[req.kind]}: {req.note}
                </p>
                <p className="muted">
                  {labelFor(req.requestedBy)}
                  {req.assignedTo ? ` · technologist: ${labelFor(req.assignedTo)}` : ""} ·{" "}
                  {formatDateTime(req.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
