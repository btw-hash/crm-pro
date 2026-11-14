import Link from "next/link";
import { redirect } from "next/navigation";
import { ExportButton } from "@/app/_components/export-button";
import { PeriodSelect } from "./_components/period-select";
import { ViewSwitcher } from "./_components/view-switcher";
import {
  buildAnalyticsCsv,
  DEFAULT_VIEW,
  exportFilename,
  resolveView,
  VIEW_LABELS,
} from "./analytics-view";
import {
  canSeePersonalAnalytics,
  canSeeTeamAnalytics,
  canUseManagerAssistant,
} from "@/domain/shared/role";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/** Trend label: +18% / -5% / — (no baseline available). */
function deltaLabel(percent: number | null): string {
  if (percent === null) return "—";
  return percent > 0 ? `+${percent}%` : `${percent}%`;
}

/** English pluralization for order count. */
function pluralOrders(n: number): string {
  return n === 1 ? `${n} order` : `${n} orders`;
}

/** Initials from "First Last" -> "FL" (fallback: first letter of the label). */
function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const result = `${first}${second}`.toUpperCase();
  return result === "" ? "•" : result;
}

// Glassmorphic card block (CRM Pro warm theme).
const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: 22,
  padding: 22,
};

// Palette of decreasing saturation for bars/avatars/shares.
const SHADE_FILLS = ["#1c1f27", "#363c49", "#565e6e", "#9aa0ad", "#cfd3db"] as const;
// --accent2 / --bar-alt are missing from globals.css -> literals from the spec.
const ACCENT2 = "#E3B32B";
const DONUT_STROKES = ["#1c1f27", ACCENT2, "var(--accent)", "#d2d6dd"] as const;
const PRODUCT_FILLS = ["var(--accent)", "#2b303c", "#565e6e", "#9aa0ad"] as const;
// Donut circumference: 2π·48 ≈ 301.6 (matches the reference design).
const DONUT_CIRCUMFERENCE = 301.6;

// "Revenue by industry" (row4, head of sales only). There's no real breakdown by
// industry in the sales data (no such field/repository), so this is a DETERMINISTIC
// DEMO derivative from the design reference: a fixed list of industries + monthly
// shares. The numbers are for demonstration (not from AI, not from the ERP) — they
// exist to lay out the block per the design.
const INDUSTRY_FILLS = [
  "#1c1f27",
  "#2f3540",
  "#444b59",
  "#595f6d",
  "#717784",
  "#8e94a0",
  "#aab0bc",
] as const;
const INDUSTRY_DEMO: ReadonlyArray<readonly [label: string, valueMln: number]> = [
  ["Bakery Plants & Bakeries", 140],
  ["Confectionery Producers", 110],
  ["HoReCa", 85],
  ["Dairy Production", 68],
  ["Meat & Fish Processing", 58],
  ["Ice Cream", 48],
  ["Retail & Decor", 31],
];
const INDUSTRY_TOTAL_LABEL = "$540K";
const INDUSTRY_MAX_MLN = Math.max(...INDUSTRY_DEMO.map(([, v]) => v));

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; view?: string }>;
}) {
  const user = await requireUser();
  // The technologist doesn't see commercial figures — this section isn't available to them.
  if (!canSeePersonalAnalytics(user.role)) {
    redirect("/");
  }
  const params = await searchParams;
  // "View" — the revenue trend chart period: 4 (default) / 6 / 12 months / all time.
  const periodParam = params.period;
  const periodMonths =
    periodParam === "all" ? Infinity : periodParam === "6" ? 6 : periodParam === "12" ? 12 : 4;
  // Short label for the trend window pill in the card corner (matches the "View" choice).
  const periodLabel =
    periodParam === "all"
      ? "All time"
      : periodParam === "6"
        ? "Half-year"
        : periodParam === "12"
          ? "Year"
          : "Quarter";
  // "Breakdown" — revenue split by manager (default) / product (?view=, SSR).
  const view = resolveView(params.view);
  // Head of sales — the whole department; a manager — only their personal breakdown.
  const isTeam = canSeeTeamAnalytics(user.role);
  const scope = isTeam ? undefined : { managerId: user.id };
  // Manager assistant — head-only (see /assistant). We only show the "Ask the assistant"
  // button to those for whom the section will actually open.
  const canAskAssistant = canUseManagerAssistant(user.role);

  const container = getContainer();
  const [analytics, sales] = await Promise.all([
    container.getFunnelAnalytics(scope),
    container.getSalesAnalytics(scope),
  ]);
  const maxStage = Math.max(1, ...analytics.byStage.map((s) => s.count));
  const winRatePct = Math.round(analytics.winRate * 100);

  // Semicircular gauge: center (100,105), r=82, arc 180°→0°.
  const gaugeAngle = Math.PI - (Math.min(100, Math.max(0, winRatePct)) / 100) * Math.PI;
  const gaugeEndX = 100 + 82 * Math.cos(gaugeAngle);
  const gaugeEndY = 105 - 82 * Math.sin(gaugeAngle);
  // largeArcFlag isn't needed — the fill is always ≤180°.
  const gaugeWonPath = `M18,105 A82,82 0 0 1 ${gaugeEndX.toFixed(2)},${gaugeEndY.toFixed(2)}`;

  // "Deals by stage" donut: up to 4 segments with a non-zero count.
  const donutSource = analytics.byStage.filter((s) => s.count > 0).slice(0, 4);
  const donutTotal = Math.max(1, ...[donutSource.reduce((sum, s) => sum + s.count, 0)]);
  // Labels for the "Deals by stage" donut segments (screenshot reference: the last
  // stage is called "Closed", unlike the funnel, where it's "Completed").
  const donutLabels: Record<string, string> = {
    qualification: "Qualification",
    audit: "Audit",
    testing: "Testing",
    quote: "Proposal",
    completed: "Closed",
  };
  let donutOffset = 0;
  const donutSegments = donutSource.map((stat, i) => {
    const sharePct = Math.round((stat.count / donutTotal) * 100);
    const dash = (stat.count / donutTotal) * DONUT_CIRCUMFERENCE;
    const segment = {
      stroke: DONUT_STROKES[i % DONUT_STROKES.length] ?? "#1c1f27",
      dashArray: `${dash.toFixed(1)} ${DONUT_CIRCUMFERENCE}`,
      dashOffset: -donutOffset,
      label: donutLabels[stat.stage] ?? stat.stage,
      sharePct,
    };
    donutOffset += dash;
    return segment;
  });

  // Latest months for the trend bar chart (up to 4, chronological order).
  const monthBars = Number.isFinite(periodMonths)
    ? sales.byMonth.slice(-periodMonths)
    : sales.byMonth;
  // Bar heights are scaled by the maximum of the VISIBLE window (not the global peak
  // across all months) — otherwise, with an early peak, the 4 visible bars look empty.
  const maxMonth = Math.max(1, ...monthBars.map((m) => m.revenueMinor));

  // Breakdown (?view=): the selected breakdown is shown as a "large" card (avatars/shares),
  // the complementary one as a bar chart; the export is built for the selected breakdown +
  // visible month window.
  const primaryByManager = view === "managers";
  const primaryRows = primaryByManager ? sales.byManager : sales.byProduct;
  const primaryTitle = primaryByManager
    ? isTeam
      ? "Revenue by manager"
      : "My revenue"
    : "Revenue by product";
  const secondaryRows = primaryByManager ? sales.byProduct : sales.byManager;
  const secondaryTitle = primaryByManager ? "Revenue by product" : "Revenue by manager";
  const csv = buildAnalyticsCsv(sales, view, monthBars);

  return (
    <section
      className="scr"
      style={{
        fontFamily: "Arial",
        color: "#16181d",
        animation: "scrIn .28s cubic-bezier(.4,0,.2,1)",
      }}
    >
      {/* heading */}
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
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px" }}>
            {isTeam ? "Sales & Funnel Analytics" : "My Analytics"}
          </div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: 4 }}>
            {isTeam
              ? "Summary across all department processes › numbers from ERP/calculations · June 2026"
              : "Your personal sales and funnel — only your clients · numbers from ERP/calculations"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <ViewSwitcher
            param="view"
            prefix="Breakdown: "
            value={view}
            defaultValue={DEFAULT_VIEW}
            options={[
              { value: "managers", label: VIEW_LABELS.managers },
              { value: "products", label: VIEW_LABELS.products },
            ]}
          />
          <PeriodSelect />
          <ExportButton
            filename={exportFilename(view, periodParam)}
            headers={csv.headers}
            rows={csv.rows}
          />
        </div>
      </div>

      {/* row1 — 12-column grid: trend (span 8) is 2:1 wider than the AI card (span 4) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Card A: revenue trend */}
        <div style={{ ...glassCard, padding: 24, gridColumn: "span 8" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span style={{ font: "600 17px Arial" }}>Monthly revenue trend</span>
            {/* Period pill (reference/screenshot: a "Half-year ▾" pill in the card corner).
                The real period switcher is "View" in the header (PeriodSelect); this
                pill only reflects the selected trend window and isn't clickable. */}
            <span
              style={{
                border: "1px solid #e8e1d9",
                background: "rgba(255,255,255,0.6)",
                color: "#6b6f78",
                font: "600 12px Arial",
                padding: "5px 12px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              {periodLabel} ▾
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 30 }}>
            <div>
              <div style={{ font: "700 34px Arial", letterSpacing: "-.5px", margin: "8px 0 4px" }}>
                {sales.totalRevenue}
              </div>
              <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: 14 }}>
                total for the period · {pluralOrders(sales.orderCount)}
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px 16px",
                  font: "500 12px Arial",
                  color: "#6b6f78",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{ width: 9, height: 9, borderRadius: "50%", background: "#c2c6cf" }}
                  />
                  Last year
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                  Current year
                </span>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 14,
                height: 170,
              }}
            >
              {monthBars.map((row, i) => {
                const heightPct = Math.max(8, Math.round((row.revenueMinor / maxMonth) * 100));
                const isPeak = row.revenueMinor === maxMonth;
                // Bar fill: dark / slate / accent (peak) / yellow (latest).
                const fill = isPeak
                  ? "var(--accent)"
                  : i === 0
                    ? "#2b303c"
                    : i === monthBars.length - 1
                      ? ACCENT2
                      : "#454b59";
                const badgeStyle: React.CSSProperties = isPeak
                  ? {
                      // Peak: solid accent (matching the bar) + white text — readable on
                      // a light background. It used to be a translucent white background
                      // with white text → the label was "white on white" and invisible.
                      background: "var(--accent)",
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(31,45,80,0.18)",
                    }
                  : i === monthBars.length - 1
                    ? {
                        background: "#fff",
                        boxShadow: "0 2px 8px rgba(0,0,0,.1)",
                        color: "#16181d",
                      }
                    : { background: i === 0 ? "#2b303c" : "#454b59", color: "#fff" };
                return (
                  <div
                    key={row.month}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      height: "100%",
                      justifyContent: "flex-end",
                    }}
                  >
                    <div
                      style={{
                        font: "600 11px Arial",
                        padding: "4px 9px",
                        borderRadius: 7,
                        marginBottom: 7,
                        whiteSpace: "nowrap",
                        ...badgeStyle,
                      }}
                    >
                      {row.amount}
                    </div>
                    <div
                      title={`${row.month}: ${row.amount}`}
                      style={{
                        width: "100%",
                        height: `${heightPct}%`,
                        borderRadius: 12,
                        background: fill,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card B: AI assistant (dark) */}
        <div
          style={{
            gridColumn: "span 4",
            background:
              "radial-gradient(135% 122% at 100% -4%, rgba(231,186,60,0.40) 0%, transparent 56%), radial-gradient(135% 135% at -5% 106%, rgba(206,68,60,0.46) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 22,
            padding: 24,
            color: "#fff",
            position: "relative",
            overflow: "hidden",
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
              AI insight
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
          <div style={{ font: "700 21px/1.25 Arial", margin: "24px 0 10px" }}>
            AI Assistant <span style={{ color: "var(--accent-bright)" }}>CRM Pro</span>
          </div>
          <div style={{ font: "400 13px/1.5 Arial", color: "rgba(255,255,255,.72)" }}>
            Cocoa powder is up 18%. I recommend increasing purchases from Kestrel Cocoa.
          </div>
          <div style={{ font: "400 11px Arial", color: "rgba(255,255,255,.45)", marginTop: 6 }}>
            Sample insight. Live analysis of your data is available in the assistant.
          </div>
          {canAskAssistant ? (
            <Link
              href="/assistant"
              style={{
                marginTop: 18,
                alignSelf: "flex-start",
                border: "none",
                background: "#fff",
                color: "#16181d",
                font: "600 13px Arial",
                padding: "11px 20px",
                borderRadius: 12,
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              Ask the assistant
            </Link>
          ) : null}
        </div>
      </div>

      {/* row2 — three span-4 cards on the 12-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Card C: revenue for the latest month */}
        <div style={{ ...glassCard, gridColumn: "span 4" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "1.5px solid #e3e5e9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#6b6f78",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
              {sales.latestMonth ? `Revenue for ${sales.latestMonth}` : "Revenue for last month"}
            </div>
          </div>
          <div style={{ font: "700 32px Arial", letterSpacing: "-.5px", margin: "14px 0 6px" }}>
            {sales.latestMonthRevenue}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                background: "#e7f5ee",
                color: "#1f9e6c",
                font: "600 12px Arial",
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              {deltaLabel(sales.deltaVsPrevMonthPercent)}
            </span>
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>vs previous month</span>
          </div>
        </div>

        {/* Card D: win-rate gauge */}
        <div
          style={{
            ...glassCard,
            gridColumn: "span 4",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <span style={{ font: "600 15px Arial", alignSelf: "flex-start" }}>Funnel win rate</span>
          <svg width="200" height="115" viewBox="0 0 200 115" style={{ marginTop: 6 }}>
            <g strokeLinecap="round">
              <path
                d="M18,105 A82,82 0 0 1 182,105"
                fill="none"
                stroke="#e6e8ec"
                strokeWidth="13"
              />
              <path d={gaugeWonPath} fill="none" stroke="#2b303c" strokeWidth="13" />
            </g>
            <text
              x="100"
              y="95"
              textAnchor="middle"
              fontFamily="Arial"
              fontWeight="700"
              fontSize="30"
              fill="#16181d"
            >
              {winRatePct}%
            </text>
            <text
              x="100"
              y="112"
              textAnchor="middle"
              fontFamily="Arial"
              fontWeight="400"
              fontSize="11"
              fill="#9a9ea8"
            >
              won / completed
            </text>
          </svg>
        </div>

        {/* Card E: "Deals by stage" donut */}
        <div style={{ ...glassCard, gridColumn: "span 4" }}>
          <span style={{ font: "600 15px Arial" }}>Deals by stage</span>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
            <svg width="110" height="110" viewBox="0 0 120 120">
              <g transform="rotate(-90 60 60)" fill="none" strokeWidth="15">
                {donutSegments.map((seg, i) => (
                  <circle
                    key={i}
                    cx="60"
                    cy="60"
                    r="48"
                    stroke={seg.stroke}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                  >
                    <title>{`${seg.label}: ${seg.sharePct}%`}</title>
                  </circle>
                ))}
              </g>
              <text
                x="60"
                y="65"
                textAnchor="middle"
                fontFamily="Arial"
                fontWeight="700"
                fontSize="19"
                fill="#16181d"
              >
                {analytics.total}
              </text>
            </svg>
            <div
              style={{ display: "flex", flexDirection: "column", gap: 8, font: "500 11.5px Arial" }}
            >
              {donutSegments.map((seg, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span
                    style={{ width: 9, height: 9, borderRadius: "50%", background: seg.stroke }}
                  />
                  {seg.label} {seg.sharePct}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* row3 — three span-4 cards on the 12-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
        }}
      >
        {/* Card F: funnel by stage */}
        <div style={{ ...glassCard, gridColumn: "span 4" }}>
          <span style={{ font: "600 16px Arial" }}>Funnel by stage</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {analytics.byStage.map((stat, i) => {
              const widthPct = Math.max(6, Math.round((stat.count / maxStage) * 100));
              const fill = SHADE_FILLS[Math.min(i, SHADE_FILLS.length - 1)] ?? "#1c1f27";
              const label =
                (
                  {
                    qualification: "Qualification",
                    audit: "Audit",
                    test_requested: "Test request",
                    testing: "Testing",
                    quote: "Proposal",
                    completed: "Completed",
                  } as Record<string, string>
                )[stat.stage] ?? stat.stage;
              return (
                <div key={stat.stage} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ font: "500 12px Arial", width: 96, color: "#6b6f78" }}>
                    {label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      maxWidth: `${widthPct}%`,
                      height: 24,
                      borderRadius: 8,
                      background: fill,
                    }}
                  />
                  <span style={{ font: "600 12px Arial", width: 32 }}>{stat.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card G: selected breakdown (?view=) — avatars/shares */}
        <div style={{ ...glassCard, gridColumn: "span 4" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span style={{ font: "600 16px Arial" }}>{primaryTitle}</span>
            <span style={{ font: "500 12px Arial", color: "#9a9ea8" }}>current breakdown</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {primaryRows.map((row, i) => (
              <div
                key={row.label}
                title={`${row.label}: ${row.amount} (${row.sharePercent}%)`}
                style={{ display: "flex", alignItems: "center", gap: 11 }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 11,
                    background: SHADE_FILLS[Math.min(i, SHADE_FILLS.length - 2)] ?? "#1c1f27",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "700 12px Arial",
                  }}
                >
                  {initials(row.label)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ font: "600 13px Arial" }}>{row.label}</div>
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>
                    share {row.sharePercent}%
                  </div>
                </div>
                <span
                  style={{ font: "700 14px Arial", color: i === 0 ? "var(--accent)" : undefined }}
                >
                  {row.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Card H: complementary breakdown (opposite of ?view=) — share bars */}
        <div style={{ ...glassCard, gridColumn: "span 4" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span style={{ font: "600 16px Arial" }}>{secondaryTitle}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {secondaryRows.map((row, i) => {
              const widthPct = Math.max(6, Math.min(100, row.sharePercent));
              const fill = PRODUCT_FILLS[Math.min(i, PRODUCT_FILLS.length - 1)] ?? "var(--accent)";
              return (
                <div key={row.label} title={`${row.label}: ${row.amount} (${row.sharePercent}%)`}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      font: "500 13px Arial",
                      marginBottom: 6,
                    }}
                  >
                    <span>{row.label}</span>
                    <span style={{ fontWeight: 700 }}>{row.amount}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: "#eef0f2" }}>
                    <div
                      style={{
                        height: 8,
                        width: `${widthPct}%`,
                        borderRadius: 6,
                        background: fill,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* row4 — "Revenue by industry" (head of sales only).
          Demo breakdown from the design reference: there's no real industry breakdown in the data. */}
      {isTeam ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 16,
            marginTop: 16,
          }}
        >
          <div style={{ ...glassCard, padding: 24, gridColumn: "span 12" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 18,
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                <span style={{ font: "600 17px Arial" }}>Revenue by industry</span>
                <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                  total {INDUSTRY_TOTAL_LABEL}
                </span>
              </div>
              {/* Industry period pill switcher. Static (demo block, no backend): "Month" is
                  active — it matches the breakdown shown. */}
              <div
                style={{
                  display: "inline-flex",
                  gap: 2,
                  background: "rgba(28,31,39,0.05)",
                  border: "1px solid rgba(120,130,150,0.14)",
                  borderRadius: 999,
                  padding: 3,
                }}
              >
                {(["Week", "Month", "Year"] as const).map((chip) => {
                  const active = chip === "Month";
                  return (
                    <span
                      key={chip}
                      style={{
                        background: active ? "#1c1f27" : "transparent",
                        color: active ? "#fff" : "#5a5f6b",
                        boxShadow: active ? "0 2px 6px rgba(28,31,39,0.18)" : "none",
                        font: "600 11.5px Arial",
                        padding: "5px 13px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {chip}
                    </span>
                  );
                })}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {INDUSTRY_DEMO.map(([label, valueMln], i) => {
                const widthPct = Math.max(6, Math.round((valueMln / INDUSTRY_MAX_MLN) * 100));
                const fill = INDUSTRY_FILLS[Math.min(i, INDUSTRY_FILLS.length - 1)] ?? "#1c1f27";
                const amount = `$${valueMln}K`;
                return (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <span
                      style={{
                        width: 212,
                        flex: "none",
                        font: "500 13px Arial",
                        color: "#16181d",
                      }}
                    >
                      {label}
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 22,
                        borderRadius: 7,
                        background: "#eef0f2",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: 22,
                          width: `${widthPct}%`,
                          borderRadius: 7,
                          background: fill,
                        }}
                      />
                    </div>
                    <span
                      style={{
                        width: 96,
                        flex: "none",
                        textAlign: "right",
                        font: "700 13.5px Arial",
                        color: "#16181d",
                      }}
                    >
                      {amount}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
