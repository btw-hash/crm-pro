"use client";

import { useActionState, type CSSProperties } from "react";
import { generateDescriptionsAction } from "../actions";

const GLASS_PILL: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.6)",
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(14px) saturate(1.4)",
  WebkitBackdropFilter: "blur(14px) saturate(1.4)",
  color: "#16181d",
  font: "600 13px Arial",
  padding: "10px 15px",
  borderRadius: "24px",
  boxShadow: "0 4px 14px rgba(31,45,80,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "8px",
  whiteSpace: "nowrap",
};

/**
 * Batch AI description generation button (#213) with inline feedback (#236) — the glass
 * pill from the design reference in the top-right of the catalog header (arrow icon in a
 * dark 21×21 square). On completion — "generated N of M"; on AI service failure — a soft
 * error, no 500 overlay. The result message is on its own line (see `descriptionsFeedback`).
 */
export function GenerateDescriptionsButton() {
  const [state, action, pending] = useActionState(generateDescriptionsAction, null);
  return (
    <form action={action}>
      <button type="submit" disabled={pending} style={GLASS_PILL}>
        <span
          style={{
            width: "21px",
            height: "21px",
            borderRadius: "6px",
            background: "#1c1f27",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="M7 17L17 7M17 7H8M17 7v9" />
          </svg>
        </span>
        {pending ? "Generating…" : "Generate AI descriptions"}
      </button>
      {state?.ok ? (
        <div
          style={{
            font: "400 12px Arial",
            color: "#6b6f78",
            margin: "8px 0 0",
            display: "flex",
            alignItems: "center",
            gap: "7px",
          }}
        >
          <span
            style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#197a48" }}
          />
          Done: generated {state.generated} of {state.total}.
        </div>
      ) : state && !state.ok ? (
        <p style={{ font: "400 12px Arial", color: "var(--accent)", margin: "8px 0 0" }}>
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
