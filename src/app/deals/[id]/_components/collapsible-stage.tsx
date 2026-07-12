"use client";

import { type ReactNode, useState } from "react";

/**
 * Collapsed, completed stage section: header with "completed" tag + chevron; body
 * (stage data) is hidden and expands on click. Own state (useState), not a native
 * <details> — in the target environment a closed <details> does not hide its content.
 * This way only the current stage is expanded on the card, and passed stages stay collapsed.
 */
export function CollapsibleStage({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginTop: "1.4rem" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#9a9ea8"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{
            flex: "none",
            transition: "transform .18s ease",
            transform: open ? "rotate(90deg)" : "none",
          }}
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
        <span style={{ fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-0.2px" }}>
          {title}
        </span>
        <span className="badge"> completed</span>
      </button>
      {open ? <div style={{ marginTop: "0.9rem" }}>{children}</div> : null}
    </div>
  );
}
