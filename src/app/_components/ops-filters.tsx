"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface OpsFilterChip {
  /** Visible chip label. */
  readonly label: string;
  /** Value for `?filter=` (the first chip is the default value, the param is omitted). */
  readonly value: string;
}

export interface OpsMetric {
  readonly value: string | number;
  readonly label: string;
  readonly color: string;
  readonly bordered: boolean;
}

/**
 * Filter row for operational screens: chips toggle `?filter=<value>` in the URL
 * (the server page reads it and narrows the table), the active chip is highlighted.
 * The first chip is the default value: selecting it removes the param from the URL.
 * Other query params are preserved.
 *
 * Presentation (reference design): filters AND metrics live in ONE warm glass card.
 * On the left — a label ("FILTER"/"STATUS") and a segmented pill of chips; on the
 * right — a metrics block with centered value-over-label columns with a border-left.
 */
export function OpsFilters({
  chips,
  metrics = [],
  paramName = "filter",
  label = "FILTER",
}: {
  chips: OpsFilterChip[];
  metrics?: OpsMetric[];
  /** Query param name for this row of chips (defaults to `filter`). */
  paramName?: string;
  /** Label to the left of the chips: "FILTER" (default) or e.g. "STATUS". */
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const defaultValue = chips[0]?.value ?? "all";
  const active = searchParams.get(paramName) ?? defaultValue;

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === defaultValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div
      data-ops-filters
      style={{
        background: "rgba(252,249,245,0.4)",
        backdropFilter: "blur(7px) saturate(1.1)",
        WebkitBackdropFilter: "blur(7px) saturate(1.1)",
        border: "1px solid rgba(120,130,150,0.15)",
        borderRadius: "16px",
        padding: "13px 16px 14px",
        marginBottom: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "11px",
            flexWrap: "wrap",
            minWidth: 0,
          }}
        >
          <span
            style={{
              font: "600 10.5px Arial",
              color: "#9a9ea8",
              letterSpacing: ".7px",
            }}
          >
            {label}
          </span>
          <div
            style={{
              display: "inline-flex",
              gap: "3px",
              background: "rgba(28,31,39,0.045)",
              border: "1px solid rgba(120,130,150,0.14)",
              borderRadius: "999px",
              padding: "4px",
            }}
          >
            {chips.map((chip) => {
              const on = chip.value === active;
              return (
                <button
                  key={chip.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => select(chip.value)}
                  style={{
                    border: "none",
                    background: on ? "#1c1f27" : "transparent",
                    color: on ? "#fff" : "#5a5f6b",
                    boxShadow: on ? "0 2px 7px rgba(28,31,39,0.20)" : "none",
                    font: "600 12.5px Arial",
                    padding: "7px 15px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "background .12s, color .12s",
                  }}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
        {metrics.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", flex: "none" }}>
            {metrics.map((m) => (
              <div
                key={m.label}
                style={{
                  textAlign: "center",
                  padding: "0 20px",
                  borderLeft: m.bordered ? "1px solid rgba(120,130,150,0.16)" : "0",
                }}
              >
                <div
                  style={{
                    font: "700 20px Arial",
                    color: m.color,
                    letterSpacing: "-.5px",
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    font: "400 11px Arial",
                    color: "#9a9ea8",
                    marginTop: "4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.label}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
