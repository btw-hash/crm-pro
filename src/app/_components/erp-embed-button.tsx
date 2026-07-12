"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PILL: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "7px",
  border: "1px solid #e8e1d9",
  background: "#fff",
  color: "#16181d",
  font: "600 13px Arial",
  padding: "10px 16px",
  borderRadius: "24px",
  cursor: "pointer",
  whiteSpace: "nowrap",
  flex: "none",
};

/**
 * "Open in ERP" button — embeds the ERP window RIGHT ON the site (an iframe in a
 * right-side panel), without leaving to a separate tab. A fallback "open in a new
 * tab" link covers a production ERP that may forbid framing (X-Frame-Options/CSP),
 * in which case the iframe would be empty.
 */
export function ErpEmbedButton({
  url,
  label,
  title,
}: {
  url: string;
  label: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={title} style={PILL}>
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        {label}
      </button>
      {open && mounted
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="ERP window"
              className="drawer-overlay"
              onClick={() => setOpen(false)}
            >
              <aside
                className="drawer"
                style={{ width: "min(760px, 100%)" }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    marginBottom: "12px",
                  }}
                >
                  <span style={{ font: "700 16px Arial", letterSpacing: "-.2px" }}>ERP</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ font: "600 12px Arial", color: "#6b6f78", textDecoration: "none" }}
                    >
                      Open in a new tab ↗
                    </a>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Close"
                      style={{
                        width: "32px",
                        height: "32px",
                        border: "1px solid #e8e1d9",
                        background: "#fff",
                        color: "#9a9ea8",
                        font: "400 18px Arial",
                        borderRadius: "10px",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <iframe
                  src={url}
                  title="ERP window"
                  style={{
                    display: "block",
                    width: "100%",
                    height: "calc(100% - 56px)",
                    border: "1px solid #e8e1d9",
                    borderRadius: "12px",
                  }}
                />
              </aside>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
