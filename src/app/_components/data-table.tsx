"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { GLASS_PANEL } from "./ops-ui";

export interface DataColumn {
  /** Column label in the header. */
  readonly label: string;
  /** Content alignment (defaults to left). */
  readonly align?: "left" | "right";
  /** Width share (flex), defaults to 1. */
  readonly flex?: number;
  /** Whether the column can be sorted (defaults to true). */
  readonly sortable?: boolean;
}

export interface DataRow {
  /** Stable row key. */
  readonly id: string;
  /** Ready-made cells in column order (pre-rendered server-side: text, badges, buttons). */
  readonly cells: readonly ReactNode[];
  /** Sort values in column order (number/string). Needed for sortable columns. */
  readonly sortValues?: readonly (string | number | null)[];
  /** Mute the row (e.g. "not selected"). */
  readonly faded?: boolean;
}

const COL_HEAD: CSSProperties = {
  display: "flex",
  gap: "12px",
  padding: "14px 6px 12px",
  borderBottom: "1px solid #eef0f2",
};

const COL_LABEL: CSSProperties = {
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
};

const ROW: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 6px",
  borderBottom: "1px solid #f3f4f6",
};

const CELL: CSSProperties = { font: "500 13px Arial", minWidth: 0 };

function compareValues(a: string | number | null, b: string | number | null): number {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en", { numeric: true });
}

/**
 * A single table shared across operational screens: glass panel + column sorting
 * (click the header) + pagination. Data arrives already filtered from the server
 * (via `?filter=`); exporting the current selection is a separate button above
 * the table. Cells are prepared server-side (text/badges/form buttons) and passed
 * as ReactNode; sorting relies on `sortValues`.
 */
export function DataTable({
  columns,
  rows,
  pageSize = 12,
  initialSort,
  emptyText = "No records",
}: {
  columns: readonly DataColumn[];
  rows: readonly DataRow[];
  pageSize?: number;
  initialSort?: { index: number; dir: "asc" | "desc" };
  emptyText?: string;
}) {
  const [sortIndex, setSortIndex] = useState<number | null>(initialSort?.index ?? null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(initialSort?.dir ?? "asc");
  const [page, setPage] = useState(0);

  const sortedRows = useMemo(() => {
    if (sortIndex === null) return rows;
    const copy = [...rows];
    copy.sort((ra, rb) => {
      const av = ra.sortValues?.[sortIndex] ?? null;
      const bv = rb.sortValues?.[sortIndex] ?? null;
      const cmp = compareValues(av, bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortIndex, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const visibleRows = sortedRows.slice(safePage * pageSize, safePage * pageSize + pageSize);

  function toggleSort(index: number) {
    if (columns[index]?.sortable === false) return;
    if (sortIndex === index) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortIndex(index);
      setSortDir("asc");
    }
    setPage(0);
  }

  return (
    <div style={GLASS_PANEL}>
      <div style={COL_HEAD}>
        {columns.map((col, i) => {
          const sortable = col.sortable !== false;
          const active = sortIndex === i;
          const arrow = active ? (sortDir === "asc" ? " ↑" : " ↓") : "";
          const sharedStyle: CSSProperties = {
            ...COL_LABEL,
            flex: col.flex ?? 1,
            textAlign: col.align === "right" ? "right" : "left",
            display: "block",
          };
          if (!sortable) {
            return (
              <span key={i} style={sharedStyle}>
                {col.label}
              </span>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleSort(i)}
              aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
              style={{
                ...sharedStyle,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: active ? "#16181d" : "#9a9ea8",
              }}
            >
              {col.label}
              {arrow}
            </button>
          );
        })}
      </div>

      {visibleRows.length === 0 ? (
        <div style={{ ...ROW, justifyContent: "center", color: "#9a9ea8", font: "500 13px Arial" }}>
          {emptyText}
        </div>
      ) : (
        visibleRows.map((row) => (
          <div key={row.id} style={{ ...ROW, opacity: row.faded ? 0.55 : 1 }}>
            {columns.map((col, i) => (
              <span
                key={i}
                style={{
                  ...CELL,
                  flex: col.flex ?? 1,
                  textAlign: col.align === "right" ? "right" : "left",
                }}
              >
                {row.cells[i]}
              </span>
            ))}
          </div>
        ))
      )}

      {totalPages > 1 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            padding: "12px 6px 4px",
            font: "500 12px Arial",
            color: "#6a5f54",
          }}
        >
          <span>
            {safePage * pageSize + 1}–{Math.min(sortedRows.length, (safePage + 1) * pageSize)} of{" "}
            {sortedRows.length}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              aria-label="Previous page"
              style={pagerButtonStyle(safePage === 0)}
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label="Next page"
              style={pagerButtonStyle(safePage >= totalPages - 1)}
            >
              ›
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pagerButtonStyle(disabled: boolean): CSSProperties {
  return {
    border: "1px solid rgba(120,130,150,0.2)",
    background: "rgba(255,255,255,0.6)",
    color: "#16181d",
    font: "600 14px Arial",
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
  };
}
