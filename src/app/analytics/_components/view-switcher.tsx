"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Analytics view switcher: changes `?view=` (breakdown by manager/product)
 * and `?period=` (trend window) in the URL — the server page re-reads them and
 * rebuilds the data (SSR). Other query params are preserved. Style — a warm glass
 * button matching the reference. Selecting the default value removes the parameter
 * from the URL (clean address).
 */

export interface SwitcherOption {
  readonly value: string;
  readonly label: string;
}

export function ViewSwitcher({
  param,
  prefix,
  options,
  value,
  defaultValue,
  menuMinWidth = 184,
}: {
  /** Query parameter name (`view` | `period`). */
  readonly param: string;
  /** Text before the current value on the button (e.g. "View: "). */
  readonly prefix: string;
  readonly options: readonly SwitcherOption[];
  /** Current (already normalized on the server) value. */
  readonly value: string;
  /** Default value — selecting it removes the parameter from the URL. */
  readonly defaultValue: string;
  /** Width of the dropdown menu (reference: "Breakdown" 184, "View/period" 200). */
  readonly menuMinWidth?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside the menu.
  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function select(next: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (next === defaultValue) {
      params.delete(param);
    } else {
      params.set(param, next);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  const current = options.find((o) => o.value === value) ?? options[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          border: "1px solid rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(14px) saturate(1.4)",
          WebkitBackdropFilter: "blur(14px) saturate(1.4)",
          color: "#16181d",
          font: "600 13px Arial",
          padding: "11px 16px",
          borderRadius: 24,
          boxShadow: "0 4px 14px rgba(31,45,80,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {prefix}
        {current?.label ?? ""} ▾
      </button>
      {open ? (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 20,
            minWidth: menuMinWidth,
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px) saturate(1.4)",
            WebkitBackdropFilter: "blur(20px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.8)",
            boxShadow: "0 14px 38px rgba(31,45,80,0.18)",
            borderRadius: 16,
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(option.value)}
                style={{
                  border: "none",
                  textAlign: "left",
                  background: active ? "#1c1f27" : "transparent",
                  color: active ? "#fff" : "#16181d",
                  font: "600 13px Arial",
                  padding: "9px 12px",
                  borderRadius: 10,
                  cursor: "pointer",
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
