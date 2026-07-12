import type { CSSProperties, ReactNode } from "react";
import { FilterButton } from "./ops-filter-button";

/**
 * Shared presentational primitives for operational screens (procurement, shipments,
 * packing, defects, etc.). These styles and components used to be copied into each
 * of 9 screens — now they live here. A server module (no "use client"), usable
 * directly in server pages.
 */

/** Glass panel wrapping a table (the warm reference-design theme). */
export const GLASS_PANEL: CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "22px",
  padding: "8px 22px 14px",
};

export const STATUS_TONE = {
  ok: { background: "#e7f5ee", color: "#197a48" },
  warn: { background: "#fbf1d6", color: "#9a6a00" },
  bad: { background: "#f7e4e2", color: "var(--accent)" },
  neu: { background: "#efe9e2", color: "#6a5f54" },
} as const;

export type StatusTone = keyof typeof STATUS_TONE;

/** Inline style for a pill badge by tone. */
export function statusBadgeStyle(tone: StatusTone): CSSProperties {
  return {
    ...STATUS_TONE[tone],
    font: "600 11px Arial",
    padding: "4px 10px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  };
}

/** Status pill badge (ok/warn/bad/neu). */
export function StatusBadge({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return <span style={statusBadgeStyle(tone)}>{children}</span>;
}

/**
 * Header for an operational screen: title + breadcrumb + an optional action on the
 * right. Per the reference design, the action group always shows a glass "Filter"
 * button with a funnel before the caller's own `action` (usually `ExportButton`) —
 * rendered automatically unless `filterButton={false}`. This way every operational
 * screen gets the button without edits.
 */
export function OpsHeader({
  title,
  breadcrumb,
  action,
  filterButton = true,
}: {
  title: string;
  breadcrumb: string;
  action?: ReactNode;
  /** Show the glass "Filter" button to the left of `action` (defaults to yes). */
  filterButton?: boolean;
}) {
  const showActionRow = filterButton || Boolean(action);
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
      {showActionRow ? (
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {filterButton ? <FilterButton /> : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** Table section heading. */
export function SectionTitle({
  children,
  ...rest
}: { children: ReactNode } & { style?: CSSProperties }) {
  return (
    <h2
      style={{
        font: "700 17px Arial",
        letterSpacing: "-.3px",
        margin: "0 0 12px",
        color: "#16181d",
        ...rest.style,
      }}
    >
      {children}
    </h2>
  );
}
