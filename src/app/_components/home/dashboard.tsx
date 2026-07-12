"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Role } from "@/domain/shared/role";

/**
 * Home — a bento dashboard matching the reference design system (reference/CRM-PRO.dc.html):
 * a 12-column grid, a dark AI-insight card, hand-drawn SVGs (gauge/donut/funnel),
 * team load bars, a role switcher. Data is real (from the CRM/ERP), built server-side
 * and passed down as ready-made DTOs (presentation stays clean of domain types).
 */

// ─── DTOs (built server-side) ────────────────────────────────────────────────
export interface TeamMemberVM {
  readonly initials: string;
  readonly name: string;
  readonly note: string | null;
  readonly noteColor: string | null;
  readonly count: number;
  readonly unit: string;
  readonly loadPct: number;
  readonly barColor: string;
  readonly avatarBg: string;
}
export interface DonutSegVM {
  readonly label: string;
  readonly count: number;
  readonly pct: number;
  readonly color: string;
}
export interface FunnelBarVM {
  readonly label: string;
  readonly count: number;
  readonly widthPct: number;
  readonly color: string;
}
export interface NotifVM {
  readonly title: string;
  readonly time: string;
  readonly unread: boolean;
}
export interface ChipVM {
  readonly text: string;
  readonly bg: string;
  readonly color: string;
}
/** Metric in the 4-column "Team activity" grid: a large number + label. */
export interface ActivityMetricVM {
  readonly value: string;
  readonly label: string;
}
/** Head of sales row 2, "Team activity" card. */
export interface TeamActivityVM {
  readonly total: string;
  readonly periodWord: string;
  readonly delta: string | null;
  readonly metrics: readonly ActivityMetricVM[];
}
/** Head of sales row 2, "Sales plan" card. */
export interface SalesPlanVM {
  readonly actual: string;
  readonly target: string;
  readonly pct: number;
  readonly tag: ChipVM | null;
  readonly left: string;
}
/** "Decisions on you" row: title, gray context, action link, dot color. */
export interface DecisionRowVM {
  readonly title: string;
  readonly context: string;
  readonly action: string;
  readonly dotColor: string;
}
/** "Needs attention" row — a client with a status chip (list of clients). */
export interface AttentionClientVM {
  readonly client: string;
  readonly context: string;
  readonly status: ChipVM;
}
export interface HeadVM {
  readonly teamMeta: string;
  readonly team: readonly TeamMemberVM[];
  readonly aiTitle: string;
  readonly aiBody: string;
  readonly activity: TeamActivityVM;
  readonly plan: SalesPlanVM;
  readonly donutTotal: number;
  readonly donut: readonly DonutSegVM[];
  readonly decisions: readonly DecisionRowVM[];
  readonly decisionsWaiting: number;
  readonly attentionCritical: number;
  readonly attentionClients: readonly AttentionClientVM[];
  readonly notifications: readonly NotifVM[];
}
export interface StatCardVM {
  readonly label: string;
  readonly value: string;
  readonly valueAccent: boolean;
  readonly sub: string;
  readonly chips: readonly ChipVM[];
  /** Show `sub` as a separate gray line BELOW the value (reference: technologist KPI). */
  readonly subBelow?: boolean;
  /**
   * Explicit color for the large value (overrides `valueAccent`) — for cards where the
   * reference design sets a special color (e.g. green #1f9e6c on procurement's
   * "Assortment", CRM-PRO.dc.html:1050).
   */
  readonly valueColor?: string;
}
export interface AiInsightVM {
  readonly title: string;
  readonly body: string;
  /**
   * The second word of the title, highlighted in ochre (#E3B32B) — e.g. "procurement's"/
   * "the technologist's". If set, the title renders as "Assistant <ochre>{word}</>".
   */
  readonly word?: string;
  /** Whether to show the "Ask the assistant" button (only for roles with access — head/mop). */
  readonly canAsk?: boolean;
}
export interface SimpleVM {
  readonly cards: readonly StatCardVM[];
  /** Dark AI-insight tile (present for every role — design §8). */
  readonly ai?: AiInsightVM;
  /**
   * Horizontal (rather than vertical) form of the AI tile — the tile goes at the
   * BOTTOM of the grid last, in a single row (procurement, design §). Vertical at
   * the top by default.
   */
  readonly aiHorizontal?: boolean;
  /**
   * A "trio of inline KPIs" card instead of a large value+chips: rendered last
   * (procurement's "Operational queues"). The card's label is the title, mini is
   * the three KPIs.
   */
  readonly triCard?: TriKpiCardVM;
}

/** Procurement's "Operational queues" card: three inline mini-KPIs (number + label). */
export interface TriKpiCardVM {
  readonly label: string;
  readonly mini: readonly { value: string; label: string; accent?: boolean }[];
}

// ─── Technologist Home (rich bento matching the reference, rows 1-3) ─────────
/** "Today in the calendar" event: time, client, type, place, a "now/next" flag. */
export interface TechEventVM {
  readonly time: string;
  readonly title: string;
  readonly typeLabel: string;
  readonly typeChip: { readonly bg: string; readonly color: string };
  readonly place: string;
  readonly range: string;
  readonly barColor: string;
  readonly flag: { readonly text: string; readonly bg: string; readonly color: string } | null;
}
/** "Tech queue" row: type icon, client+action, due date, status chip. */
export interface TechQueueRowVM {
  readonly kind: "test" | "onsite" | "consult";
  readonly title: string;
  readonly context: string;
  readonly due: string;
  readonly status: ChipVM;
}
/** "Samples for testing" row: product, client·weight, status chip. */
export interface TechSampleVM {
  readonly product: string;
  readonly context: string;
  readonly status: ChipVM;
}
export interface TechVM {
  readonly ai: AiInsightVM;
  readonly todayCountLabel: string;
  readonly dateLabel: string;
  readonly events: readonly TechEventVM[];
  readonly cards: readonly StatCardVM[];
  readonly queueUrgent: number;
  readonly queueToday: number;
  readonly queue: readonly TechQueueRowVM[];
  readonly samples: readonly TechSampleVM[];
}

// ─── Manager Home (rich bento matching reference/CRM-PRO.dc.html) ────────────
/** "My deals for today" row: client + action, gray context, status chip. */
export interface HeroRowVM {
  readonly client: string;
  readonly action: string;
  readonly context: string;
  readonly status: ChipVM;
}
/** "My monthly plan" KPI — actual/target + a red progress bar + "N% done (+X%)". */
export interface PlanKpiVM {
  readonly fact: string;
  readonly target: string;
  readonly progressPct: number;
  readonly doneLabel: string;
  readonly deltaLabel: string | null;
}
/** "My conversion" KPI — a large %, an "above/below average" chip, department %. */
export interface ConversionKpiVM {
  readonly value: string;
  readonly badge: ChipVM | null;
  readonly deptLabel: string;
}
/** "My deals in progress" KPI — a count + "worth $…" + qualification/test/proposal chips. */
export interface InWorkKpiVM {
  readonly count: string;
  readonly portfolio: string;
  readonly chips: readonly ChipVM[];
}
/** "Hot deals" row: client + status chip. */
export interface HotRowVM {
  readonly client: string;
  readonly status: ChipVM;
}
/** "Recent activity" row: type (icon/color), text, relative time. */
export interface RecentRowVM {
  readonly kind: "call" | "visit" | "note" | "task";
  readonly text: string;
  readonly time: string;
}
export interface MopVM {
  readonly overdueCount: number;
  readonly todayCount: number;
  readonly hero: readonly HeroRowVM[];
  readonly plan: PlanKpiVM;
  readonly conversion: ConversionKpiVM;
  readonly inWork: InWorkKpiVM;
  readonly funnel: readonly FunnelBarVM[];
  readonly hot: readonly HotRowVM[];
  readonly recent: readonly RecentRowVM[];
  readonly ai: AiInsightVM;
}

export interface HomeData {
  readonly head?: HeadVM;
  readonly mop?: MopVM;
  readonly technologist?: TechVM;
  readonly procurement?: SimpleVM;
  readonly accountant?: SimpleVM;
  readonly logist?: SimpleVM;
}

const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: 22,
  padding: 22,
};

/** Adds a sequential `--i` number to the tile's style for CSS entrance stagger (#300).
 *  The custom CSS variable isn't part of the CSSProperties type — hence the cast. */
function bento(index: number, extra: React.CSSProperties): React.CSSProperties {
  return { ...extra, "--i": index } as React.CSSProperties;
}

const PILLS: ReadonlyArray<readonly [Role, string]> = [
  ["head", "Head of sales"],
  ["mop", "Manager"],
  ["technologist", "Technologist"],
  ["procurement", "Procurement"],
  ["accountant", "Accountant"],
  ["logist", "Logistics"],
];

// ─── Charts (hand-drawn SVG, matching the reference) ─────────────────────────
function Donut({
  total,
  segments,
  centered = false,
}: {
  total: number;
  segments: readonly DonutSegVM[];
  /** Head of sales reference layout: SVG 134, centered, legend with row highlighting. */
  centered?: boolean;
}) {
  const C = 2 * Math.PI * 48;
  const [hover, setHover] = useState<number | null>(null);
  const active = hover != null ? segments[hover] : null;
  const svgSize = centered ? 134 : 110;
  let acc = 0;
  return (
    <div
      style={
        centered
          ? {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 26,
              flex: 1,
              marginTop: 12,
            }
          : { display: "flex", alignItems: "center", gap: 14, marginTop: 10 }
      }
      onMouseLeave={() => setHover(null)}
    >
      <svg width={svgSize} height={svgSize} viewBox="0 0 120 120">
        <g transform="rotate(-90 60 60)" fill="none" strokeWidth={15}>
          {segments.map((s, i) => {
            const len = C * (s.pct / 100);
            const off = -C * (acc / 100);
            acc += s.pct;
            const dim = hover != null && hover !== i;
            return (
              <circle
                key={i}
                className="chart-seg"
                cx={60}
                cy={60}
                r={48}
                stroke={s.color}
                strokeWidth={hover === i ? 18 : 15}
                strokeDasharray={`${len} ${C}`}
                strokeDashoffset={off}
                opacity={dim ? 0.35 : 1}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              >
                <title>{`${s.label}: ${s.count} (${s.pct}%)`}</title>
              </circle>
            );
          })}
        </g>
        {/* Center: the overall total; on hover — drill into the segment's count. */}
        <text
          x="60"
          y={active ? 58 : 65}
          textAnchor="middle"
          fontFamily="Arial"
          fontWeight={700}
          fontSize={19}
          fill="#16181d"
        >
          {active ? active.count : total}
        </text>
        {active ? (
          <text x="60" y={76} textAnchor="middle" fontFamily="Arial" fontSize={9} fill="#9a9ea8">
            {active.label}
          </text>
        ) : null}
      </svg>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: centered ? 6 : 8,
          font: centered ? "500 12px Arial" : "500 11.5px Arial",
        }}
      >
        {segments.map((s, i) => {
          const on = hover === i;
          const dotSz = centered && on ? 11 : centered ? 9 : 9;
          return (
            <span
              key={i}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: centered ? 8 : 7,
                fontWeight: on ? 700 : 500,
                cursor: centered ? "pointer" : "default",
                whiteSpace: "nowrap",
                ...(centered
                  ? {
                      padding: "4px 9px",
                      borderRadius: 8,
                      background: on ? "rgba(28,31,39,0.05)" : "transparent",
                      color: on ? "#16181d" : "#6b6f78",
                      transition: "background .15s, color .15s",
                    }
                  : {}),
              }}
            >
              <span
                style={{
                  width: dotSz,
                  height: dotSz,
                  borderRadius: "50%",
                  background: s.color,
                  flex: "none",
                  transition: centered ? "width .15s, height .15s" : undefined,
                }}
                aria-hidden
              />
              {s.label} {s.pct}%
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Card icons (inline SVG, matching the reference) ─────────────────────────
const AlertIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

// ─── Head of sales segment toggles (decorative, client-side state) ───────────
/**
 * Periods/horizons — DECORATIVE toggles matching the reference (CRM-PRO.dc.html:882/889).
 * The data slice doesn't depend on the period (no per-period breakdown in the head
 * dashboard), so the toggles only change their own highlighting — no backend call.
 */
const ACTIVITY_PERIODS = ["Week", "Month"] as const;
const PLAN_HORIZONS = ["Month", "Quarter", "Year"] as const;

/** Pill group for a segment control (reference styles): active dark, inactive transparent. */
function SegmentToggle({
  options,
  value,
  onChange,
  padX,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  padX: number;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 2,
        background: "rgba(28,31,39,0.05)",
        border: "1px solid rgba(120,130,150,0.14)",
        borderRadius: 999,
        padding: 3,
        flex: "none",
      }}
    >
      {options.map((opt) => {
        const on = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              border: "none",
              background: on ? "#1c1f27" : "transparent",
              color: on ? "#fff" : "#5a5f6b",
              boxShadow: on ? "0 2px 6px rgba(28,31,39,0.18)" : "none",
              font: "600 11.5px Arial",
              padding: `5px ${padX}px`,
              borderRadius: 999,
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "background .12s, color .12s",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

// ─── Head of sales layout (full, matching the reference) ─────────────────────
function HeadLayout({ d, onAskAssistant }: { d: HeadVM; onAskAssistant: () => void }) {
  // Decorative toggles in the "Team activity" / "Sales plan" card headers.
  const [activityPeriod, setActivityPeriod] = useState<string>(ACTIVITY_PERIODS[0]);
  const [planHorizon, setPlanHorizon] = useState<string>(PLAN_HORIZONS[0]);
  return (
    <>
      {/* Row 1: "Team" (span 8) + AI "Head of sales assistant" (span 4). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Team */}
        <div
          className="bento-tile"
          style={bento(0, { ...GLASS, gridColumn: "span 8", padding: 24 })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ font: "600 17px Arial" }}>Team — load and discipline</div>
              <div style={{ font: "500 12px Arial", color: "#9a9ea8", marginTop: 3 }}>
                {d.teamMeta}
              </div>
            </div>
            <Link
              href="/analytics"
              title="Full team report in analytics"
              style={{
                flex: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                font: "600 12.5px Arial",
                color: "#BF322B",
                textDecoration: "none",
                whiteSpace: "nowrap",
                padding: "5px 9px",
                margin: "-5px -9px 0 0",
                borderRadius: 9,
              }}
            >
              Full report
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {d.team.map((m, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "center", gap: 13 }}
                title={`Load ${m.loadPct}%`}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 11,
                    background: m.avatarBg,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "700 12px Arial",
                    flex: "none",
                  }}
                >
                  {m.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: "600 13px Arial" }}>
                    {m.name}
                    {m.note ? (
                      <span style={{ color: m.noteColor ?? "#9a9ea8", fontWeight: 600 }}>
                        {" "}
                        · {m.note}
                      </span>
                    ) : null}
                  </div>
                  <div
                    style={{ height: 6, borderRadius: 4, background: "#eef0f2", marginTop: 6 }}
                    aria-hidden
                  >
                    <div
                      style={{
                        height: 6,
                        width: `${m.loadPct}%`,
                        borderRadius: 4,
                        background: m.barColor,
                        transition: "width .5s cubic-bezier(.4,0,.2,1)",
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: "right", flex: "none", width: 84 }}>
                  <div style={{ font: "700 14px Arial" }}>{m.count}</div>
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>{m.unit}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI insight */}
        <div
          className="bento-tile"
          style={bento(1, {
            gridColumn: "span 4",
            background:
              "radial-gradient(135% 122% at 100% -4%, rgba(231,186,60,0.40) 0%, transparent 56%), radial-gradient(135% 135% at -5% 106%, rgba(206,68,60,0.46) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 22,
            padding: 24,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
          })}
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
                strokeWidth={2.5}
              >
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </div>
          </div>
          <div style={{ font: "700 21px/1.25 Arial", margin: "24px 0 10px" }}>
            {d.aiTitle} <span style={{ color: "#E3B32B" }}>for the head of sales</span>
          </div>
          <div style={{ font: "400 13px/1.5 Arial", color: "rgba(255,255,255,.72)" }}>
            {d.aiBody}
          </div>
          <button
            onClick={onAskAssistant}
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
            }}
          >
            Ask the assistant
          </button>
        </div>
      </div>

      {/* Row 2: Team activity · Sales plan · Deals by stage (span 4 each). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {/* Team activity — a large action count + delta + a 4-metric grid. */}
        <div className="bento-tile" style={bento(2, { ...GLASS, gridColumn: "span 4" })}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ font: "600 15px Arial" }}>Team activity</span>
            {/* Decorative period segment toggle (client-side state, no backend): the
                metrics in this slice don't depend on the period — a visual control
                matching the reference. */}
            <SegmentToggle
              options={ACTIVITY_PERIODS}
              value={activityPeriod}
              onChange={setActivityPeriod}
              padX={12}
            />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9, margin: "18px 0 0" }}>
            <div style={{ font: "700 34px Arial", letterSpacing: "-.5px", color: "#16181d" }}>
              {d.activity.total}
            </div>
            <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
              actions this {d.activity.periodWord}
            </span>
            {/* The delta badge is always present (reference p.883): "—" when there's no data for the prior period. */}
            <span
              style={{
                marginLeft: "auto",
                alignSelf: "center",
                background: "#e7f5ee",
                color: "#1f9e6c",
                font: "600 12px Arial",
                padding: "3px 9px",
                borderRadius: 20,
              }}
            >
              {d.activity.delta ?? "—"}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid rgba(120,130,150,0.16)",
            }}
          >
            {d.activity.metrics.map((m, i) => (
              <div
                key={i}
                style={{
                  borderLeft: i > 0 ? "1px solid rgba(120,130,150,0.16)" : "none",
                  paddingLeft: i > 0 ? 12 : 0,
                }}
              >
                <div
                  style={{
                    font: "700 26px Arial",
                    color: "#16181d",
                    letterSpacing: "-.4px",
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </div>
                <div style={{ font: "400 11.5px Arial", color: "#9a9ea8", marginTop: 6 }}>
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales plan — actual/target + a red progress bar + a tag + remaining. */}
        <div
          className="bento-tile"
          style={bento(3, {
            ...GLASS,
            gridColumn: "span 4",
            display: "flex",
            flexDirection: "column",
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 8,
            }}
          >
            <span style={{ font: "600 15px Arial" }}>Sales plan</span>
            {/* Decorative horizon segment toggle (client-side state, no backend): actual/
                target in this slice aren't recalculated — a visual control matching the
                reference. */}
            <SegmentToggle
              options={PLAN_HORIZONS}
              value={planHorizon}
              onChange={setPlanHorizon}
              padX={11}
            />
          </div>
          <div style={{ font: "700 30px Arial", letterSpacing: "-.5px", margin: "12px 0 0" }}>
            {d.plan.actual}{" "}
            <span style={{ font: "500 14px Arial", color: "#9a9ea8" }}>/ {d.plan.target}</span>
          </div>
          <div
            style={{
              height: 9,
              background: "#eef0f2",
              borderRadius: 5,
              margin: "14px 0 10px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${d.plan.pct}%`,
                height: "100%",
                background: "#BF322B",
                borderRadius: 5,
                transition: "width .5s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
              <b style={{ color: "#16181d", fontWeight: 700 }}>{d.plan.pct}%</b> done
            </span>
            {d.plan.tag ? (
              <span
                style={{
                  background: d.plan.tag.bg,
                  color: d.plan.tag.color,
                  font: "600 11px Arial",
                  padding: "3px 9px",
                  borderRadius: 999,
                  whiteSpace: "nowrap",
                  flex: "none",
                }}
              >
                {d.plan.tag.text}
              </span>
            ) : null}
          </div>
          <div style={{ font: "400 11.5px Arial", color: "#9a9ea8", marginTop: 7 }}>
            {d.plan.left}
          </div>
        </div>

        {/* Deals by stage — a 134×134 donut + a legend with highlighting. */}
        <div
          className="bento-tile"
          style={bento(4, {
            ...GLASS,
            gridColumn: "span 4",
            display: "flex",
            flexDirection: "column",
          })}
        >
          <span style={{ font: "600 15px Arial" }}>Deals by stage</span>
          <Donut total={d.donutTotal} segments={d.donut} centered />
        </div>
      </div>

      {/* Row 3: Decisions on you · Needs attention · Notifications (span 4 each). */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>
        {/* Decisions on you — a list of decisions with a status dot and an action link. */}
        <div className="bento-tile" style={bento(5, { ...GLASS, gridColumn: "span 4" })}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 13,
            }}
          >
            <span style={{ font: "600 16px Arial" }}>Decisions on you</span>
            <span
              style={{
                background: "#f7e4e2",
                color: "#BF322B",
                font: "600 11px Arial",
                padding: "3px 9px",
                borderRadius: 999,
              }}
            >
              {d.decisionsWaiting} waiting
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {d.decisions.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                No decisions pending approval.
              </span>
            ) : (
              d.decisions.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "9px 10px",
                    margin: "0 -10px",
                    borderRadius: 11,
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: row.dotColor,
                    }}
                    aria-hidden
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "600 13px Arial", color: "#16181d" }}>{row.title}</div>
                    {row.context ? (
                      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 1 }}>
                        {row.context}
                      </div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      flex: "none",
                      font: "600 11px Arial",
                      color: "#6b6f78",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.action}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Needs attention — an icon + a critical-count chip + a note + a client list. */}
        <div className="bento-tile" style={bento(6, { ...GLASS, gridColumn: "span 4" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "#f7e4e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#BF322B",
                flex: "none",
              }}
            >
              {AlertIcon}
            </div>
            <span style={{ font: "600 16px Arial" }}>Needs attention</span>
            <span
              style={{
                marginLeft: "auto",
                background: "#f7e4e2",
                color: "#BF322B",
                font: "600 11px Arial",
                padding: "3px 9px",
                borderRadius: 999,
                whiteSpace: "nowrap",
              }}
            >
              {d.attentionCritical} critical
            </span>
          </div>
          <div
            style={{
              font: "400 12px Arial",
              color: "#9a9ea8",
              marginBottom: 10,
              lineHeight: 1.45,
            }}
          >
            Deals with a risk of losing the client or money — worth stepping in.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {d.attentionClients.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                No critical deals — the team is running smoothly.
              </span>
            ) : (
              d.attentionClients.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "9px 10px",
                    margin: "0 -10px",
                    borderRadius: 11,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "600 13px Arial", color: "#16181d" }}>{row.client}</div>
                    {row.context ? (
                      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 1 }}>
                        {row.context}
                      </div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      flex: "none",
                      background: row.status.bg,
                      color: row.status.color,
                      font: "600 11px Arial",
                      padding: "4px 10px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.status.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bento-tile" style={bento(7, { ...GLASS, gridColumn: "span 4" })}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <span style={{ font: "600 16px Arial" }}>Notifications</span>
            <a
              href="/notifications"
              style={{ font: "500 12px Arial", color: "#BF322B", textDecoration: "none" }}
            >
              All →
            </a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            {d.notifications.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                No notifications yet.
              </span>
            ) : (
              d.notifications.map((n, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: n.unread ? "#BF322B" : "#cfd3db",
                      marginTop: 5,
                      flex: "none",
                    }}
                    aria-hidden
                  />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}
                    >
                      <span style={{ font: `${n.unread ? 700 : 500} 13px Arial` }}>{n.title}</span>
                      {n.unread ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            background: "#f7e4e2",
                            color: "#BF322B",
                            font: "700 9px Arial",
                            letterSpacing: ".3px",
                            padding: "1px 7px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}
                        >
                          important
                        </span>
                      ) : null}
                    </div>
                    <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>{n.time}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/** AI tile title: "Assistant <ochre>{word}</>", or just the title if there's no word. */
function aiTitleContent(ai: AiInsightVM): React.ReactNode {
  if (!ai.word) return ai.title;
  return (
    <>
      Assistant <span style={{ color: "#E3B32B" }}>{ai.word}</span>
    </>
  );
}

/** "AI insight" badge + a round arrow icon (header of the vertical AI tile). */
const AI_ARROW = (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
  >
    <path d="M7 17L17 7M17 7H8M17 7v9" />
  </svg>
);

const AI_GRADIENT =
  "radial-gradient(135% 122% at 100% -4%, rgba(231,186,60,0.40) 0%, transparent 56%), radial-gradient(135% 135% at -5% 106%, rgba(206,68,60,0.46) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)";

/**
 * The dark AI insight tile. `horizontal` — a compact form (badge → title+text →
 * button in a single row), like procurement's tile at the bottom of the grid;
 * otherwise — vertical, at the top.
 */
function AiInsightTile({
  ai,
  onAsk,
  horizontal = false,
  bentoIndex = 0,
  gridColumn,
}: {
  ai: AiInsightVM;
  onAsk: () => void;
  horizontal?: boolean;
  bentoIndex?: number;
  gridColumn?: string;
}) {
  const askBtn =
    ai.canAsk === false ? null : (
      <button
        onClick={onAsk}
        style={{
          flex: horizontal ? "none" : undefined,
          marginTop: horizontal ? 0 : 16,
          alignSelf: horizontal ? undefined : "flex-start",
          border: "none",
          background: "#fff",
          color: "#16181d",
          font: "600 13px Arial",
          padding: "11px 20px",
          borderRadius: 12,
          cursor: "pointer",
        }}
      >
        Ask the assistant
      </button>
    );

  if (horizontal) {
    return (
      <div
        className="bento-tile"
        style={bento(bentoIndex, {
          gridColumn,
          background:
            "radial-gradient(120% 160% at 100% -10%, rgba(231,186,60,0.40) 0%, transparent 52%), radial-gradient(120% 160% at -5% 110%, rgba(206,68,60,0.46) 0%, transparent 52%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 22,
          padding: "20px 24px",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        })}
      >
        <span
          style={{
            flex: "none",
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
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ font: "700 16px Arial", marginBottom: 4 }}>{aiTitleContent(ai)}</div>
          <div style={{ font: "400 13px/1.5 Arial", color: "rgba(255,255,255,.72)" }}>
            {ai.body}
          </div>
        </div>
        {askBtn}
      </div>
    );
  }

  return (
    <div
      className="bento-tile"
      style={bento(bentoIndex, {
        gridColumn,
        background: AI_GRADIENT,
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 22,
        padding: 24,
        color: "#fff",
        marginBottom: gridColumn ? undefined : 16,
        display: "flex",
        flexDirection: "column",
      })}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {AI_ARROW}
        </div>
      </div>
      <div style={{ font: "700 21px/1.25 Arial", margin: "24px 0 10px" }}>{aiTitleContent(ai)}</div>
      <div style={{ font: "400 13px/1.5 Arial", color: "rgba(255,255,255,.72)" }}>{ai.body}</div>
      {askBtn}
    </div>
  );
}

/** SimpleLayout KPI card (a large value + a caption + chips). */
function StatCard({ c, index }: { c: StatCardVM; index: number }) {
  return (
    <div className="bento-tile" style={bento(index, GLASS)}>
      <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{c.label}</div>
      <div
        style={{
          font: "700 30px Arial",
          letterSpacing: "-.5px",
          margin: "12px 0 10px",
          color: c.valueColor ?? (c.valueAccent ? "#BF322B" : "#16181d"),
        }}
      >
        {c.value}
        {c.sub && !c.subBelow ? (
          <>
            {" "}
            <span style={{ font: "500 13px Arial", color: "#9a9ea8" }}>{c.sub}</span>
          </>
        ) : null}
      </div>
      {c.sub && c.subBelow ? (
        <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{c.sub}</div>
      ) : null}
      {c.chips.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {c.chips.map((chip, j) => (
            <span
              key={j}
              style={{
                background: chip.bg,
                color: chip.color,
                font: "600 12px Arial",
                padding: "4px 11px",
                borderRadius: 999,
              }}
            >
              {chip.text}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Procurement's "Operational queues" card — a trio of inline mini-KPIs. */
function TriKpiCard({ card, index }: { card: TriKpiCardVM; index: number }) {
  return (
    <div className="bento-tile" style={bento(index, GLASS)}>
      <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{card.label}</div>
      <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
        {card.mini.map((m, i) => (
          <div key={i}>
            <div style={{ font: "700 22px Arial", color: m.accent ? "#9a6a00" : "#16181d" }}>
              {m.value}
            </div>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compact layouts: Procurement / Accountant / Logistics ───────────────────
function SimpleLayout({ d, onAskAssistant }: { d: SimpleVM; onAskAssistant: () => void }) {
  const totalTiles = d.cards.length + (d.triCard ? 1 : 0);
  return (
    <>
      {/* Vertical AI at the top — only when the tile is NOT horizontal. */}
      {d.ai && !d.aiHorizontal ? <AiInsightTile ai={d.ai} onAsk={onAskAssistant} /> : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: d.aiHorizontal
            ? "repeat(3, 1fr)"
            : "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {d.cards.map((c, i) => (
          <StatCard key={i} c={c} index={i} />
        ))}
        {d.triCard ? <TriKpiCard card={d.triCard} index={d.cards.length} /> : null}
        {/* Horizontal AI tile — last, full grid width (procurement). */}
        {d.ai && d.aiHorizontal ? (
          <AiInsightTile
            ai={d.ai}
            onAsk={onAskAssistant}
            horizontal
            bentoIndex={totalTiles}
            gridColumn="span 3"
          />
        ) : null}
      </div>
    </>
  );
}

// ─── "Recent activity" feed icons (by activity kind, inline SVG, stroke 2) ─
const RECENT_ICON: Record<
  RecentRowVM["kind"],
  { bg: string; color: string; path: React.ReactNode }
> = {
  call: {
    bg: "#e7f5ee",
    color: "#1f9e6c",
    path: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
  },
  note: {
    bg: "#e7eef9",
    color: "#2f5fb0",
    path: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  },
  task: {
    bg: "#fbf1d6",
    color: "#9a6a00",
    path: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />,
  },
  visit: {
    bg: "#efe9e2",
    color: "#6a5f54",
    path: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
  },
};

/**
 * Manager layout (a rich bento matching reference/CRM-PRO.dc.html): a wide column on
 * the left (today's deals + KPIs + funnel/hot/recent), a dark AI "Sales assistant" tile
 * on the right. All numbers/text arrive ready-made from mopVM (page.tsx); the component
 * is pure markup.
 */
function MopLayout({ d, onAskAssistant }: { d: MopVM; onAskAssistant: () => void }) {
  return (
    <>
      {/* Row 1: "My deals for today" (span 8) + AI "Sales assistant" (span 4). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          className="bento-tile"
          style={bento(0, { ...GLASS, gridColumn: "span 8", padding: 24 })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ font: "600 17px Arial" }}>My deals for today</span>
            <div style={{ display: "flex", gap: 7 }}>
              <span
                style={{
                  background: "#f7e4e2",
                  color: "#BF322B",
                  font: "600 12px Arial",
                  padding: "4px 11px",
                  borderRadius: 999,
                }}
              >
                overdue {d.overdueCount}
              </span>
              <span
                style={{
                  background: "#fbf1d6",
                  color: "#9a6a00",
                  font: "600 12px Arial",
                  padding: "4px 11px",
                  borderRadius: 999,
                }}
              >
                today {d.todayCount}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {d.hero.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                No tasks for today — a good moment to advance deals pending approval.
              </span>
            ) : (
              d.hero.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 13,
                    padding: "11px 14px",
                    background: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(255,255,255,0.7)",
                    borderRadius: 14,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "600 13px Arial", color: "#16181d" }}>
                      <span style={{ fontWeight: 700 }}>{row.client}</span>
                      {row.action ? ` — ${row.action}` : ""}
                    </div>
                    {row.context ? (
                      <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: 2 }}>
                        {row.context}
                      </div>
                    ) : null}
                  </div>
                  <span
                    style={{
                      flex: "none",
                      font: "700 11px Arial",
                      padding: "5px 12px",
                      borderRadius: 999,
                      background: row.status.bg,
                      color: row.status.color,
                    }}
                  >
                    {row.status.text}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
            <Link
              href="/deals?new=1"
              style={{
                border: "none",
                background: "#1c1f27",
                color: "#fff",
                font: "600 13px Arial",
                padding: "11px 18px",
                borderRadius: 12,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              New deal
            </Link>
            <Link
              href="/deals"
              style={{
                border: "1px solid rgba(120,130,150,0.28)",
                background: "rgba(255,255,255,0.55)",
                color: "#16181d",
                font: "600 13px Arial",
                padding: "11px 18px",
                borderRadius: 12,
                textDecoration: "none",
              }}
            >
              All deals
            </Link>
          </div>
        </div>

        {/* AI "Sales assistant" — a dark tile, the word "sales" in ochre. */}
        <div
          className="bento-tile"
          style={bento(1, {
            gridColumn: "span 4",
            background:
              "radial-gradient(135% 122% at 100% -4%, rgba(231,186,60,0.40) 0%, transparent 56%), radial-gradient(135% 135% at -5% 106%, rgba(206,68,60,0.46) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
            border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 22,
            padding: 24,
            color: "#fff",
            display: "flex",
            flexDirection: "column",
          })}
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
                strokeWidth={2.5}
              >
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </div>
          </div>
          <div style={{ font: "700 21px/1.25 Arial", margin: "24px 0 10px" }}>
            Assistant <span style={{ color: "#E3B32B" }}>sales</span>
          </div>
          <div style={{ font: "400 13px/1.5 Arial", color: "rgba(255,255,255,.72)" }}>
            {d.ai.body}
          </div>
          {d.ai.canAsk === false ? null : (
            <button
              onClick={onAskAssistant}
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
              }}
            >
              Ask the assistant
            </button>
          )}
        </div>
      </div>

      {/* Row 2: 3 KPI cards — monthly plan / conversion / deals in progress. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="bento-tile" style={bento(2, GLASS)}>
          <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>My plan for the month</div>
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px", margin: "12px 0 12px" }}>
            {d.plan.fact}{" "}
            <span style={{ font: "500 14px Arial", color: "#9a9ea8" }}>of {d.plan.target}</span>
          </div>
          <div style={{ height: 8, borderRadius: 5, background: "#eef0f2", overflow: "hidden" }}>
            <div
              style={{
                height: 8,
                width: `${d.plan.progressPct}%`,
                borderRadius: 5,
                background: "#BF322B",
                transition: "width .5s cubic-bezier(.4,0,.2,1)",
              }}
            />
          </div>
          <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: 10 }}>
            {d.plan.doneLabel}
            {d.plan.deltaLabel ? (
              <>
                {" · "}
                <span style={{ color: "#1f9e6c", fontWeight: 600 }}>{d.plan.deltaLabel}</span> vs.
                last month
              </>
            ) : null}
          </div>
        </div>

        <div className="bento-tile" style={bento(3, GLASS)}>
          <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>My conversion</div>
          <div style={{ font: "700 32px Arial", letterSpacing: "-.5px", margin: "12px 0 8px" }}>
            {d.conversion.value}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {d.conversion.badge ? (
              <span
                style={{
                  background: d.conversion.badge.bg,
                  color: d.conversion.badge.color,
                  font: "600 12px Arial",
                  padding: "4px 11px",
                  borderRadius: 999,
                }}
              >
                {d.conversion.badge.text}
              </span>
            ) : null}
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
              {d.conversion.deptLabel}
            </span>
          </div>
        </div>

        <div className="bento-tile" style={bento(4, GLASS)}>
          <div style={{ font: "400 12px Arial", color: "#9a9ea8" }}>My deals in progress</div>
          <div style={{ font: "700 32px Arial", letterSpacing: "-.5px", margin: "12px 0 10px" }}>
            {d.inWork.count}{" "}
            <span style={{ font: "500 14px Arial", color: "#9a9ea8" }}>
              worth {d.inWork.portfolio}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {d.inWork.chips.map((c, i) => (
              <span
                key={i}
                style={{
                  background: c.bg,
                  color: c.color,
                  font: "600 12px Arial",
                  padding: "4px 11px",
                  borderRadius: 999,
                }}
              >
                {c.text}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: "My funnel" + "Hot deals" + "Recent activity". */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <div className="bento-tile" style={bento(5, GLASS)}>
          <span style={{ font: "600 16px Arial" }}>My funnel</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {d.funnel.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="chart-seg"
                  style={{
                    height: 24,
                    minWidth: 44,
                    width: `${b.widthPct}%`,
                    borderRadius: 8,
                    background: b.color,
                    display: "flex",
                    alignItems: "center",
                    overflow: "hidden",
                    transition: "width .5s cubic-bezier(.4,0,.2,1)",
                  }}
                >
                  <span
                    style={{
                      font: "600 11px Arial",
                      color: i >= 3 ? "#16181d" : "#fff",
                      paddingLeft: 10,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.label}
                  </span>
                </div>
                <span style={{ font: "600 12px Arial", width: 32 }}>{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bento-tile" style={bento(6, GLASS)}>
          <span style={{ font: "600 16px Arial" }}>Hot deals</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 14 }}>
            {d.hot.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                No hot deals — everything's under control.
              </span>
            ) : (
              d.hot.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ font: "500 13px Arial", color: "#16181d" }}>{row.client}</span>
                  <span
                    style={{
                      background: row.status.bg,
                      color: row.status.color,
                      font: "600 11px Arial",
                      padding: "4px 10px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {row.status.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bento-tile" style={bento(7, GLASS)}>
          <span style={{ font: "600 16px Arial" }}>Recent activity</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 14 }}>
            {d.recent.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>No activity yet.</span>
            ) : (
              d.recent.map((row, i) => {
                const icon = RECENT_ICON[row.kind];
                return (
                  <div key={i} style={{ display: "flex", gap: 11 }}>
                    <span
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 9,
                        background: icon.bg,
                        color: icon.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "none",
                      }}
                    >
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        {icon.path}
                      </svg>
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ font: "500 13px/1.35 Arial" }}>{row.text}</div>
                      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>
                        {row.time}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Tech queue request-type icons (by kind, inline SVG, stroke 2) ──
const TECH_QUEUE_ICON: Record<
  TechQueueRowVM["kind"],
  { bg: string; color: string; path: React.ReactNode }
> = {
  test: {
    bg: "#fbf1d6",
    color: "#9a6a00",
    path: <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />,
  },
  onsite: {
    bg: "#e7eef9",
    color: "#2f5fb0",
    // The map-pin path from the reference (CRM-PRO.dc.html:1031) — a single d with an inner circle.
    path: (
      <path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z M12 11.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
    ),
  },
  consult: {
    bg: "#eef0f2",
    color: "#6b6f78",
    path: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
};

/**
 * Technologist layout (a rich bento matching reference/CRM-PRO.dc.html, lines 988-1046):
 * row 1 — the "Today's calendar" hero (span 8) + a dark AI "Technologist assistant" tile
 * (span 4); row 2 — 4 KPI cards; row 3 — "Tech request queue" (span 7) + "Samples for
 * testing" (span 5). All numbers/text arrive ready-made from techVM (page.tsx).
 */
function TechLayout({ d, onAskAssistant }: { d: TechVM; onAskAssistant: () => void }) {
  // The hovered "Today's calendar" row — chevron highlight/shift/animation (reference p.1000).
  const [hoverEvent, setHoverEvent] = useState<number | null>(null);
  const router = useRouter();
  return (
    <>
      {/* Row 1: "Today's calendar" (span 8) + AI "Technologist assistant" (span 4). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(12, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div
          className="bento-tile"
          style={bento(0, {
            ...GLASS,
            gridColumn: "span 8",
            padding: 24,
            display: "flex",
            flexDirection: "column",
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 18,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ font: "600 17px Arial", color: "#16181d" }}>Today's calendar</span>
                <span
                  style={{
                    background: "#1c1f27",
                    color: "#fff",
                    font: "600 11.5px Arial",
                    padding: "3px 11px",
                    borderRadius: 999,
                  }}
                >
                  {d.todayCountLabel}
                </span>
              </div>
              <div style={{ font: "400 12.5px Arial", color: "#9a9ea8", marginTop: 5 }}>
                {d.dateLabel} · your visits, tests, and calls
              </div>
            </div>
            <Link
              href="/calendar"
              style={{
                flex: "none",
                border: "1px solid rgba(120,130,150,0.22)",
                background: "rgba(255,255,255,0.5)",
                color: "#16181d",
                font: "600 12.5px Arial",
                padding: "9px 15px",
                borderRadius: 11,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              Calendar
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {d.events.length === 0 ? (
              <div
                style={{
                  padding: "26px 4px",
                  textAlign: "center",
                  font: "400 13px Arial",
                  color: "#9a9ea8",
                }}
              >
                No visits or tests scheduled for today.
              </div>
            ) : (
              d.events.map((ev, i) => {
                const on = hoverEvent === i;
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    title="Open in calendar"
                    onClick={() => router.push("/calendar")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push("/calendar");
                      }
                    }}
                    onMouseEnter={() => setHoverEvent(i)}
                    onMouseLeave={() => setHoverEvent(null)}
                    onFocus={() => setHoverEvent(i)}
                    onBlur={() => setHoverEvent(null)}
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      gap: 13,
                      padding: "11px 14px 11px 0",
                      borderRadius: 14,
                      cursor: "pointer",
                      background: on ? "rgba(255,255,255,0.5)" : "transparent",
                      transform: on ? "translateX(3px)" : "translateX(0)",
                      transition: "background .14s ease, transform .14s ease",
                      outline: "none",
                    }}
                  >
                    <span
                      style={{ flex: "none", width: 4, borderRadius: 999, background: ev.barColor }}
                      aria-hidden
                    />
                    <div style={{ flex: "none", width: 50, display: "flex", alignItems: "center" }}>
                      <span
                        style={{ font: "700 16px Arial", color: "#16181d", letterSpacing: "-.3px" }}
                      >
                        {ev.time}
                      </span>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
                      >
                        <span style={{ font: "600 14px Arial", color: "#16181d" }}>{ev.title}</span>
                        <span
                          style={{
                            background: ev.typeChip.bg,
                            color: ev.typeChip.color,
                            font: "600 10px Arial",
                            padding: "2px 9px",
                            borderRadius: 999,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {ev.typeLabel}
                        </span>
                        {ev.flag ? (
                          <span
                            style={{
                              background: ev.flag.bg,
                              color: ev.flag.color,
                              font: "700 9px Arial",
                              letterSpacing: ".5px",
                              padding: "2px 8px",
                              borderRadius: 999,
                            }}
                          >
                            {ev.flag.text}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ font: "400 11.5px Arial", color: "#9a9ea8", marginTop: 3 }}>
                        {ev.place}
                      </div>
                    </div>
                    <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 9 }}>
                      <span
                        style={{ font: "500 12px Arial", color: "#9a9ea8", whiteSpace: "nowrap" }}
                      >
                        {ev.range}
                      </span>
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={on ? "#9aa0ad" : "#cfd3db"}
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={{
                          transform: on ? "translateX(3px)" : "translateX(0)",
                          transition: "transform .14s ease",
                        }}
                      >
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <AiInsightTile ai={d.ai} onAsk={onAskAssistant} bentoIndex={1} gridColumn="span 4" />
      </div>

      {/* Row 2: 4 KPI cards (repeat(4,1fr)). */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 16,
        }}
      >
        {d.cards.map((c, i) => (
          <StatCard key={i} c={c} index={i + 2} />
        ))}
      </div>

      {/* Row 3: "Tech request queue" (span 7) + "Samples for testing" (span 5). */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 16 }}>
        <div
          className="bento-tile"
          style={bento(6, {
            ...GLASS,
            gridColumn: "span 7",
            padding: 24,
            display: "flex",
            flexDirection: "column",
          })}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <span style={{ font: "600 16px Arial" }}>Tech request queue</span>
            <div style={{ display: "flex", gap: 7 }}>
              <span
                style={{
                  background: "#f7e4e2",
                  color: "#BF322B",
                  font: "600 12px Arial",
                  padding: "4px 11px",
                  borderRadius: 999,
                }}
              >
                urgent {d.queueUrgent}
              </span>
              <span
                style={{
                  background: "#fbf1d6",
                  color: "#9a6a00",
                  font: "600 12px Arial",
                  padding: "4px 11px",
                  borderRadius: 999,
                }}
              >
                today {d.queueToday}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {d.queue.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>
                No new requests in the queue.
              </span>
            ) : (
              d.queue.map((row, i) => {
                const icon = TECH_QUEUE_ICON[row.kind];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 13,
                      padding: "11px 14px",
                      background: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.7)",
                      borderRadius: 14,
                    }}
                  >
                    <span
                      style={{
                        flex: "none",
                        width: 36,
                        height: 36,
                        borderRadius: 11,
                        background: icon.bg,
                        color: icon.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {icon.path}
                      </svg>
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: "600 13px Arial", color: "#16181d" }}>{row.title}</div>
                      {row.context ? (
                        <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: 2 }}>
                          {row.context}
                        </div>
                      ) : null}
                    </div>
                    <span
                      style={{ font: "500 12px Arial", color: "#6b6f78", whiteSpace: "nowrap" }}
                    >
                      {row.due}
                    </span>
                    <span
                      style={{
                        flex: "none",
                        font: "700 11px Arial",
                        padding: "5px 12px",
                        borderRadius: 999,
                        background: row.status.bg,
                        color: row.status.color,
                      }}
                    >
                      {row.status.text}
                    </span>
                  </div>
                );
              })
            )}
          </div>
          <Link
            href="/tech-queue"
            style={{
              marginTop: 18,
              alignSelf: "flex-start",
              background: "#1c1f27",
              color: "#fff",
              font: "600 13px Arial",
              padding: "11px 20px",
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            Open tech queue
          </Link>
        </div>

        <div className="bento-tile" style={bento(7, { ...GLASS, gridColumn: "span 5" })}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 13,
            }}
          >
            <span style={{ font: "600 16px Arial" }}>Samples for testing</span>
            <span style={{ font: "500 12px Arial", color: "#9a9ea8" }}>
              reserved from the warehouse
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {d.samples.length === 0 ? (
              <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>No samples reserved.</span>
            ) : (
              d.samples.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "12px 0",
                    borderBottom: i < d.samples.length - 1 ? "1px solid #f1ede7" : "none",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "600 13px Arial", color: "#16181d" }}>{row.product}</div>
                    <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>
                      {row.context}
                    </div>
                  </div>
                  <span
                    style={{
                      flex: "none",
                      background: row.status.bg,
                      color: row.status.color,
                      font: "600 11px Arial",
                      padding: "4px 10px",
                      borderRadius: 999,
                    }}
                  >
                    {row.status.text}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── The Home screen with a role switcher ────────────────────────────────────
export function HomeScreen({
  role,
  greeting,
  subtitle,
  data,
  onAskAssistant,
}: {
  role: Role;
  greeting: string;
  subtitle: string;
  data: HomeData;
  onAskAssistant?: () => void;
}) {
  const [view, setView] = useState<Role>(role);
  const has = (r: Role): boolean => Boolean(data[r as keyof HomeData]);
  const askAssistant = onAskAssistant ?? (() => (window.location.href = "/assistant"));

  return (
    <div>
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
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px" }}>{greeting}</div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: 4 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {PILLS.map(([r, label]) => {
            const enabled = has(r);
            const active = view === r;
            return (
              <button
                key={r}
                disabled={!enabled}
                onClick={() => enabled && setView(r)}
                style={{
                  border: "1px solid rgba(255,255,255,0.6)",
                  background: active ? "#1c1f27" : "rgba(255,255,255,0.55)",
                  color: active ? "#fff" : enabled ? "#16181d" : "#bcb8b2",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  font: "600 13px Arial",
                  padding: "9px 16px",
                  borderRadius: 999,
                  cursor: enabled ? "pointer" : "default",
                  boxShadow: "0 2px 8px rgba(31,45,80,0.06)",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scr" key={view}>
        {view === "head" && data.head ? (
          <HeadLayout d={data.head} onAskAssistant={askAssistant} />
        ) : view === "mop" && data.mop ? (
          <MopLayout d={data.mop} onAskAssistant={askAssistant} />
        ) : view === "technologist" && data.technologist ? (
          <TechLayout d={data.technologist} onAskAssistant={askAssistant} />
        ) : data[view as keyof HomeData] &&
          view !== "head" &&
          view !== "mop" &&
          view !== "technologist" ? (
          <SimpleLayout
            d={data[view as keyof HomeData] as SimpleVM}
            onAskAssistant={askAssistant}
          />
        ) : (
          <p style={{ font: "400 14px Arial", color: "#9a9ea8" }}>
            Go to your section via the menu on the left.
          </p>
        )}
      </div>
    </div>
  );
}
