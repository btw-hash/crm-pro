import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { OpsFilters } from "@/app/_components/ops-filters";
import {
  allDocsCollected,
  DEFAULT_ONBOARDING_DOCS,
  ONBOARDING_STATUS_LABELS,
  type OnboardingStatus,
} from "@/domain/onboarding/onboarding";
import {
  matchesOnboardingFilter,
  ONBOARDING_FILTER_LABELS,
  ONBOARDING_FILTERS,
  parseOnboardingFilter,
} from "@/domain/onboarding/onboarding-filter";
import { canSeeMargin, canSeeTeamAnalytics } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import {
  approveOnboardingAction,
  rejectOnboardingAction,
  setOnboardingDocAction,
  startOnboardingAction,
  submitOnboardingAction,
} from "./actions";

// --- CRM Pro UI warm theme: shared inline styles for the operations section ---
// Onboarding glass card: left column (data) + right 150px column (status/actions).
const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "18px",
  padding: "16px 18px",
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) 150px",
  gap: "16px",
  alignItems: "start",
};

const STATUS_TONE = {
  ok: { background: "#e7f5ee", color: "#197a48" },
  warn: { background: "#fbf1d6", color: "#9a6a00" },
  bad: { background: "#f7e4e2", color: "var(--accent)" },
  neu: { background: "#efe9e2", color: "#6a5f54" },
} as const;

function statusBadgeStyle(tone: keyof typeof STATUS_TONE): React.CSSProperties {
  return {
    ...STATUS_TONE[tone],
    font: "600 11px Arial",
    padding: "4px 11px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  };
}

const STATUS_TONE_BY_ONBOARDING: Record<OnboardingStatus, keyof typeof STATUS_TONE> = {
  collecting: "neu",
  legal_review: "warn",
  approved: "ok",
  rejected: "bad",
};

// Pill actions in the card (radius 999): glass and dark.
const PILL_GLASS_BTN: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.6)",
  background: "rgba(255,255,255,0.55)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "#16181d",
  font: "600 13px Arial",
  padding: "9px 14px",
  borderRadius: "999px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const PILL_DARK_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 13px Arial",
  padding: "9px 14px",
  borderRadius: "999px",
  cursor: "pointer",
};

// "Start onboarding" button in the form (radius 24, as in the design).
const DARK_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 13px Arial",
  padding: "11px 18px",
  borderRadius: "24px",
  cursor: "pointer",
};

// "New onboarding" form inputs (beige border, white background, radius 10).
const FORM_INPUT: React.CSSProperties = {
  display: "block",
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e8e1d9",
  borderRadius: "10px",
  padding: "9px 11px",
  font: "400 13px Arial",
  background: "#fff",
  color: "#16181d",
  outline: "none",
  marginBottom: "12px",
};

const FIELD_LABEL: React.CSSProperties = {
  font: "400 11px Arial",
  color: "#9a9ea8",
  marginBottom: "5px",
};

function OpsHeader({
  title,
  breadcrumb,
  action,
}: {
  title: string;
  breadcrumb: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: "18px",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div>
        <div style={{ font: "700 28px Arial", letterSpacing: "-.5px", color: "#16181d" }}>
          {title}
        </div>
        <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: "4px" }}>
          {breadcrumb}
        </div>
      </div>
      {action ? <div style={{ display: "flex", gap: "10px" }}>{action}</div> : null}
    </div>
  );
}

/**
 * New client onboarding (#131): a manager collects a document package → sends it
 * to legal for approval → decision. Commercial roles run it; the head of sales
 * approves (acting as legal). The section is for roles with commercial access.
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  if (!canSeeMargin(user.role)) {
    redirect("/");
  }
  const isLegal = canSeeTeamAnalytics(user.role); // head of sales = approver (acting as legal)
  const onboardings = await getContainer().listOnboardings();

  const inReview = onboardings.filter((o) => o.status === "legal_review").length;
  const approved = onboardings.filter((o) => o.status === "approved").length;
  const rejected = onboardings.filter((o) => o.status === "rejected").length;

  // Working status filter chips (?filter=, like the ops screens). Used to be a dead FilterRow.
  const activeFilter = parseOnboardingFilter((await searchParams).filter);
  const visibleOnboardings = onboardings.filter((o) => matchesOnboardingFilter(activeFilter, o));

  // Export the current (filtered) selection to CSV — the shared ExportButton, like the ops screens.
  // The "Export" button used to be dead.
  const exportRows = visibleOnboardings.map((o) => [
    o.clientName,
    o.ein ?? "",
    personLabel(o.requestedBy),
    `${o.documents.filter((d) => d.collected).length}/${o.documents.length}`,
    ONBOARDING_STATUS_LABELS[o.status],
    o.legalNote ?? "",
  ]);

  return (
    <div className="scr">
      <OpsHeader
        title="Onboarding"
        breadcrumb="Operations section › new clients"
        action={
          <ExportButton
            filename="onboarding"
            headers={["Client", "EIN", "Requested by", "Documents", "Status", "Legal note"]}
            rows={exportRows}
          />
        }
      />

      <OpsFilters
        label="STATUS"
        chips={ONBOARDING_FILTERS.map((value) => ({
          label: ONBOARDING_FILTER_LABELS[value],
          value,
        }))}
        metrics={[
          { value: onboardings.length, label: "clients", color: "#6a5f54", bordered: false },
          { value: inReview, label: "with legal", color: "#9a6a00", bordered: true },
          { value: approved, label: "approved", color: "#197a48", bordered: true },
          { value: rejected, label: "needs rework", color: "var(--accent)", bordered: true },
        ]}
      />

      <p
        style={{
          font: "400 13px Arial",
          color: "#9a9ea8",
          margin: "0 0 16px",
          maxWidth: "760px",
          lineHeight: 1.5,
        }}
      >
        Collecting the document package → legal approval. The manager marks documents as collected
        (toggles below); once the package is complete — "Send to legal".
        {isLegal
          ? " You (as legal) approve or reject with a note."
          : " Legal (the head of sales) approves or rejects with a note."}
      </p>

      <h2
        style={{
          font: "700 17px Arial",
          letterSpacing: "-.3px",
          margin: "0 0 12px",
          color: "#16181d",
        }}
      >
        Onboardings
      </h2>

      {visibleOnboardings.length > 0 ? (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "26px" }}
        >
          {visibleOnboardings.map((onb) => {
            const ready = allDocsCollected(onb);
            const collectedCount = onb.documents.filter((d) => d.collected).length;
            const tone = STATUS_TONE_BY_ONBOARDING[onb.status];
            const editable = onb.status === "collecting" || onb.status === "rejected";
            return (
              <div key={onb.id} style={CARD}>
                {/* Left column: client, documents, legal note, requester */}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                      marginBottom: "9px",
                    }}
                  >
                    <span style={{ font: "600 14px Arial", color: "#16181d" }}>
                      {onb.clientName}
                    </span>
                    {onb.ein ? (
                      <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
                        {" · "}EIN {onb.ein}
                      </span>
                    ) : null}
                    <span style={{ font: "600 12px Arial", color: "#6b6f78" }}>
                      · {collectedCount}/{onb.documents.length}
                    </span>
                  </div>
                  {editable ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                      {onb.documents.map((d) => (
                        <form key={d.name} action={setOnboardingDocAction}>
                          <input type="hidden" name="id" value={onb.id} />
                          <input type="hidden" name="doc" value={d.name} />
                          <input type="hidden" name="collected" value={(!d.collected).toString()} />
                          <button
                            type="submit"
                            title="Mark collected / unmark"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              border: `1px solid ${
                                d.collected ? "rgba(31,158,108,0.35)" : "rgba(120,130,150,0.3)"
                              }`,
                              background: d.collected
                                ? "rgba(31,158,108,0.10)"
                                : "rgba(255,255,255,0.6)",
                              color: d.collected ? "#197a48" : "#6b6f78",
                              font: "500 12px Arial",
                              padding: "5px 10px",
                              borderRadius: "999px",
                              cursor: "pointer",
                            }}
                          >
                            <span aria-hidden style={{ font: "700 12px Arial" }}>
                              {d.collected ? "✓" : "○"}
                            </span>{" "}
                            {d.name}
                          </button>
                        </form>
                      ))}
                    </div>
                  ) : (
                    <div style={{ font: "400 12px Arial", color: "#9a9ea8", lineHeight: 1.45 }}>
                      {onb.documents.map((d) => `${d.collected ? "✓" : "✗"} ${d.name}`).join(" · ")}
                    </div>
                  )}
                  {onb.legalNote ? (
                    <div
                      style={{ font: "500 12px Arial", color: "var(--accent)", marginTop: "8px" }}
                    >
                      Legal note: {onb.legalNote}
                    </div>
                  ) : null}
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: "9px" }}>
                    Requested by: {personLabel(onb.requestedBy)}
                  </div>
                </div>

                {/* Right column, 150px: status + actions */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "9px",
                    alignItems: "flex-start",
                  }}
                >
                  <span style={statusBadgeStyle(tone)}>{ONBOARDING_STATUS_LABELS[onb.status]}</span>
                  {editable && ready ? (
                    <form action={submitOnboardingAction}>
                      <input type="hidden" name="id" value={onb.id} />
                      <button type="submit" style={PILL_GLASS_BTN}>
                        Send to legal →
                      </button>
                    </form>
                  ) : null}
                  {onb.status === "legal_review" && isLegal ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                      <form action={approveOnboardingAction}>
                        <input type="hidden" name="id" value={onb.id} />
                        <button type="submit" style={PILL_DARK_BTN}>
                          Approve
                        </button>
                      </form>
                      {/* "Reject" has no input field (as in the design): if the note is
                          empty, the domain substitutes "Needs rework". */}
                      <form action={rejectOnboardingAction}>
                        <input type="hidden" name="id" value={onb.id} />
                        <button type="submit" style={{ ...PILL_GLASS_BTN, color: "var(--accent)" }}>
                          Reject
                        </button>
                      </form>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ font: "400 13px Arial", color: "#9a9ea8", padding: "16px 4px" }}>
          {/* Shared empty-state text per the design reference (CRM-PRO.dc.html:1525). */}
          No onboardings in this filter.
        </div>
      )}

      <h2
        style={{
          font: "700 17px Arial",
          letterSpacing: "-.3px",
          margin: "0 0 12px",
          color: "#16181d",
        }}
      >
        New onboarding
      </h2>
      <div style={{ ...CARD, display: "block", maxWidth: "460px", padding: "18px" }}>
        <form action={startOnboardingAction}>
          <div style={FIELD_LABEL}>Client name</div>
          <input
            name="clientName"
            required
            placeholder="Acme Foods LLC / J. Miller"
            style={FORM_INPUT}
          />

          <div style={FIELD_LABEL}>
            EIN <span style={{ color: "#bcbfc6" }}>(optional)</span>
          </div>
          <input
            name="ein"
            placeholder="XX-XXXXXXX"
            style={{ ...FORM_INPUT, marginBottom: "14px" }}
          />

          <div
            style={{
              font: "600 11px Arial",
              color: "#9a9ea8",
              letterSpacing: ".5px",
              marginBottom: "8px",
            }}
          >
            COLLECTED DOCUMENTS
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "7px",
              marginBottom: "16px",
            }}
          >
            {DEFAULT_ONBOARDING_DOCS.map((name) => (
              <label
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  font: "400 13px Arial",
                  color: "#16181d",
                }}
              >
                <input type="checkbox" name={`doc:${name}`} /> {name}
              </label>
            ))}
          </div>
          <button type="submit" style={DARK_BTN}>
            Start onboarding
          </button>
        </form>
      </div>
    </div>
  );
}
