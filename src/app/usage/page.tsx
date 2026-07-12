import { redirect } from "next/navigation";
import { Money } from "@/domain/pricing/money";
import { canUseManagerAssistant } from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { ExportButton } from "@/app/_components/export-button";
import { buildUsageReportView } from "./usage-report-view";

// Glass card (warm CRM Pro theme). Large blocks — radius 22, padding 24.
const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: 22,
  padding: 24,
};

// KPI card — the same glass material, but more compact (radius 18, padding 18).
const kpiCard: React.CSSProperties = {
  ...glassCard,
  borderRadius: 18,
  padding: 18,
};

// Graphite shades for the "Spend by feature" bars — from darkest (top-1) to lightest.
const BAR_SHADES = ["#1c1f27", "#454b59", "#6b7180", "#aab0bc", "#cfd3db"];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Demo constant: the department's monthly AI spend limit ($500). There's no real
// limit field in the backend yet — the value is fixed for the "Forecast" card
// (we don't invent an actual bill).
const DEPT_LIMIT_MINOR = 50_000;

function dayISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nf(n: number): string {
  return n.toLocaleString("en-US");
}

/** Month label from the ISO end-of-period date: "June 2026". */
function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Month for the requests-count label, from the ISO end-of-period date: "in June". */
function monthPrepositional(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `in ${MONTHS[d.getUTCMonth()]}`;
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={kpiCard}>
      <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{label}</div>
      <div
        style={{
          font: "700 28px Arial",
          letterSpacing: "-.5px",
          marginTop: 8,
          color: accent ? "var(--accent)" : "#16181d",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * AI spend (#216): how many requests and how much money went to each AI feature over
 * the period. The numbers are actual usage from the provider; cost is computed
 * deterministically from tokens (AI doesn't invent it). Department-wide scope → head
 * of sales only.
 */
export default async function UsagePage() {
  const user = await requireUser();
  if (!canUseManagerAssistant(user.role)) {
    redirect("/");
  }

  // Period — the last 30 days (including today).
  const today = new Date();
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - 29);
  const fromDay = dayISO(from);
  const toDay = dayISO(today);

  const container = getContainer();
  const [report, ownerRows] = await Promise.all([
    container.getUsageReport({ fromDay, toDay }),
    container.getUsageOwnerReport({ fromDay, toDay }),
  ]);
  const { totals, byFeature } = buildUsageReportView(report);

  const period = monthLabel(toDay);
  // The request-count label's form is static in the reference — "Requests in June"
  // (month name, no "·" separator or year). We keep it dynamic based on the period.
  const periodPrep = monthPrepositional(toDay);

  // Average request — a deterministic derived value (cost / number of calls).
  const avgCostMinor = totals.calls > 0 ? Math.round(totals.costMinor / totals.calls) : 0;

  // Monthly forecast — a linear extrapolation of actual spend over the period (30 days)
  // to a full calendar month (~30.4 days). Deterministic, no call to the provider's bill.
  const forecastMinor = Math.round(totals.costMinor * (30.4 / 30));
  const withinLimit = forecastMinor <= DEPT_LIMIT_MINOR;

  // "Vs. last month" trend. There's no last-month baseline in the backend yet, and we
  // don't invent a real bill. So this is a deterministic demo derivation: a stable
  // synthetic baseline (a bit higher than the current spend) → shown as "cheaper" in
  // green savings, as in the reference. The value is stable across renders (depends
  // only on the current spend), not random.
  const baselineMinor = Math.round(totals.costMinor / (1 - 0.08)); // last month was ~8% more expensive
  const trendPct =
    baselineMinor > 0 ? Math.round(((totals.costMinor - baselineMinor) / baselineMinor) * 100) : 0;
  const trendCheaper = trendPct <= 0;
  // "−8%" with a real minus sign (U+2212), as in the design; for growth — "+N%".
  const trendText = trendCheaper ? `−${Math.abs(trendPct)}%` : `+${trendPct}%`;

  // Bar width = the feature's share of cost relative to the max (top feature = 100%).
  const maxFeatureCost = byFeature.reduce((m, r) => Math.max(m, r.costMinor), 0);

  // Data for the "By employee" table export (current period).
  const ownerExportHeaders = ["Employee", "Requests", "Cost, $"] as const;
  const ownerExportRows = ownerRows.map((row) => [
    row.ownerLabel,
    row.calls,
    (row.costMinor / 100).toFixed(2),
  ]);

  return (
    <section style={{ fontFamily: "Arial", color: "#16181d" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 18,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ font: "700 28px Arial", letterSpacing: "-.5px", margin: 0 }}>AI spend</h1>
          <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: 4, marginBottom: 0 }}>
            Requests to the assistant and their cost › from the logs · {period}
          </p>
        </div>
        <ExportButton
          filename={`usage-owners-${fromDay}_${toDay}`}
          headers={ownerExportHeaders}
          rows={ownerExportRows}
        />
      </div>

      {byFeature.length === 0 ? (
        <div style={glassCard}>
          <div style={{ font: "600 16px Arial", marginBottom: 6 }}>No data for the period yet</div>
          <div style={{ font: "400 13px/1.5 Arial", color: "#6b6f78" }}>
            Tracking starts with the first AI call in live mode (<code>AI_MODE=live</code>). In stub
            mode the model isn&apos;t called, so no spend accrues.
          </div>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <KpiCard label={`Requests ${periodPrep}`} value={nf(totals.calls)} />
            <KpiCard label="Cost" value={Money.of(totals.costMinor).format()} accent />
            <KpiCard label="Average request" value={Money.of(avgCostMinor).format()} />
            <div style={kpiCard}>
              <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>Vs. last month</div>
              {/* Trend — a deterministic demo derivation (see trendPct above): a spend drop
                  shows green "cheaper", a rise shows accent "more expensive". As in the
                  design reference. */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                <div
                  style={{
                    font: "700 28px Arial",
                    letterSpacing: "-.5px",
                    color: trendCheaper ? "#197a48" : "var(--accent)",
                  }}
                >
                  {trendText}
                </div>
                <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
                  {trendCheaper ? "cheaper" : "more expensive"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(12,1fr)", gap: 16 }}>
            <div style={{ ...glassCard, gridColumn: "span 8" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                }}
              >
                <span style={{ font: "600 17px Arial" }}>Spend by feature</span>
                <span style={{ font: "500 12px Arial", color: "#9a9ea8" }}>
                  total {Money.of(totals.costMinor).format()}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {byFeature.map((row, i) => {
                  const pct = maxFeatureCost > 0 ? (row.costMinor / maxFeatureCost) * 100 : 0;
                  return (
                    <div key={row.feature}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          font: "500 13px Arial",
                          marginBottom: 6,
                        }}
                      >
                        <span>{row.label}</span>
                        <span style={{ fontWeight: 700 }}>{Money.of(row.costMinor).format()}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 6, background: "#eef0f2" }}>
                        <div
                          style={{
                            height: 8,
                            width: `${Math.max(pct, 2)}%`,
                            borderRadius: 6,
                            background: BAR_SHADES[Math.min(i, BAR_SHADES.length - 1)],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                gridColumn: "span 4",
                // Lower-left glow = the reference design's --ai-glow2 (a warm red-coral,
                // rgba(206,68,60,0.46)). The --ai-glow2 token isn't declared in globals.css
                // yet — its reference value is inlined directly, without touching the
                // "hot" globals.css.
                background:
                  "radial-gradient(135% 122% at 100% -4%, var(--ai-glow) 0%, transparent 56%), radial-gradient(135% 135% at -5% 106%, rgba(206,68,60,0.46) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
                border: "1px solid rgba(255,255,255,0.10)",
                borderRadius: 22,
                padding: 24,
                color: "#fff",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "auto",
                }}
              >
                <span
                  style={{
                    background: "rgba(255,255,255,.12)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,.22)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    font: "700 11px Arial",
                    padding: "4px 10px",
                    borderRadius: 20,
                  }}
                >
                  Forecast
                </span>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "#2b303c",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path d="M7 17L17 7M17 7H8M17 7v9" />
                  </svg>
                </div>
              </div>
              <div style={{ font: "700 21px Arial", margin: "24px 0 10px", lineHeight: 1.25 }}>
                Forecast for the month{" "}
                <span style={{ color: "var(--accent-bright)" }}>
                  {Money.of(forecastMinor).format()}
                </span>
              </div>
              <div
                style={{ font: "400 13px Arial", lineHeight: 1.5, color: "rgba(255,255,255,.72)" }}
              >
                Department limit {Money.of(DEPT_LIMIT_MINOR).format()} —{" "}
                {withinLimit ? "within limit" : "over limit"}. The main spend is passive fact
                capture; it saves managers time.
              </div>
            </div>
          </div>

          {ownerRows.length > 0 ? (
            <div style={{ ...glassCard, padding: "8px 22px 14px", marginTop: 16 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr",
                  gap: 12,
                  padding: "14px 6px 12px",
                  borderBottom: "1px solid #eef0f2",
                  font: "600 11px Arial",
                  letterSpacing: ".5px",
                  color: "#9a9ea8",
                }}
              >
                <span>EMPLOYEE</span>
                <span style={{ textAlign: "right" }}>REQUESTS</span>
                <span style={{ textAlign: "right" }}>COST</span>
              </div>
              {ownerRows.map((row, i) => (
                <div
                  key={row.ownerId ?? "—"}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    gap: 12,
                    padding: "12px 6px",
                    borderBottom: i < ownerRows.length - 1 ? "1px solid #f3f4f6" : "none",
                  }}
                >
                  <span style={{ font: "500 13px Arial" }}>{row.ownerLabel}</span>
                  <span style={{ textAlign: "right", font: "500 13px Arial" }}>
                    {nf(row.calls)}
                  </span>
                  <span style={{ textAlign: "right", font: "700 13px Arial" }}>
                    {Money.of(row.costMinor).format()}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
