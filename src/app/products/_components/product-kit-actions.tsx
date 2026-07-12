"use client";

import { useState, type CSSProperties } from "react";

/** Light pill button from the design reference (product card): border #e8e1d9, bg #fff, radius 24. */
const HEADER_PILL: CSSProperties = {
  border: "1px solid #e8e1d9",
  background: "#fff",
  color: "#16181d",
  font: "600 13px Arial",
  padding: "10px 16px",
  borderRadius: "24px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/** Compact button for the catalog row expansion. */
const ROW_PILL: CSSProperties = {
  border: "1px solid #e8e1d9",
  background: "#fff",
  color: "#16181d",
  font: "600 12px Arial",
  padding: "8px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

/**
 * "Copy pitch for client" button: puts the product pitch (benefits + shelf life, WITHOUT
 * margin) on the clipboard — the manager pastes it into an email/message to the client
 * themselves (similar to share in Pitcher). `variant`: 'header' — light pill in the card
 * header; 'row' — compact pill in the row expansion.
 */
export function ProductKitActions({
  pitch,
  variant = "header",
}: {
  readonly pitch: string;
  readonly variant?: "header" | "row";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(pitch);
      setCopied(true);
    } catch {
      // clipboard unavailable — the user will select the text manually
    }
  }

  const label = variant === "row" ? "Copy pitch" : "Copy for client";
  return (
    <button
      type="button"
      onClick={() => void copy()}
      style={variant === "row" ? ROW_PILL : HEADER_PILL}
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
