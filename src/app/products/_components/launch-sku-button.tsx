"use client";

import { useActionState, useEffect, useState, type CSSProperties } from "react";
import type { LaunchSkuResult } from "../actions";
import { launchSkuQualificationAction } from "../actions";

interface ClientOption {
  readonly id: string;
  readonly name: string;
}

interface LaunchSkuButtonProps {
  readonly productId: string;
  readonly clients: readonly ClientOption[];
}

const INITIAL: LaunchSkuResult | null = null;

const DARK_PILL: CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 13px Arial",
  padding: "10px 16px",
  borderRadius: "24px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const ROW_ACTION_BTN: CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 12px Arial",
  padding: "8px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const SELECT_STYLE: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e8e1d9",
  borderRadius: "10px",
  padding: "10px 11px",
  font: "400 13px Arial",
  background: "#fff",
  color: "#16181d",
};

const FORM_SUBMIT: CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 13px Arial",
  padding: "11px 18px",
  borderRadius: "12px",
  cursor: "pointer",
};

const FORM_CANCEL: CSSProperties = {
  border: "1px solid #e8e1d9",
  background: "#fff",
  color: "#6b6f78",
  font: "600 13px Arial",
  padding: "11px 16px",
  borderRadius: "12px",
  cursor: "pointer",
};

/**
 * Internal fields of the SKU launch form (client select + buttons + process path caption).
 * Shared by the product card (frosted panel) and the catalog row expansion. Markup and
 * inline styles follow the design reference (CRM-PRO.dc.html: "Launch new SKU to client").
 * Logic (server action, state) is unchanged — only the presentation differs.
 */
function LaunchSkuFormFields({
  productId,
  clients,
  onDone,
  onCancel,
}: {
  readonly productId: string;
  readonly clients: readonly ClientOption[];
  readonly onDone: () => void;
  readonly onCancel: () => void;
}) {
  const [state, formAction, pending] = useActionState(launchSkuQualificationAction, INITIAL);

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={formAction}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
        <input type="hidden" name="productId" value={productId} />
        <label style={{ flex: 1, minWidth: "240px", display: "block" }}>
          <span
            style={{
              display: "block",
              font: "400 12px Arial",
              color: "#6b6f78",
              marginBottom: "6px",
            }}
          >
            Client for the new SKU
          </span>
          <select name="clientId" required defaultValue="" style={SELECT_STYLE}>
            <option value="" disabled>
              Select a client
            </option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" disabled={pending} style={FORM_SUBMIT}>
          {pending ? "Creating…" : "Create launch process"}
        </button>
        <button type="button" onClick={onCancel} style={FORM_CANCEL}>
          Cancel
        </button>
      </div>
      {state && !state.ok ? (
        <p style={{ font: "400 12px Arial", color: "var(--accent)", margin: "10px 0 0" }}>
          {state.error}
        </p>
      ) : (
        <div style={{ font: "400 12px Arial", color: "#9a9ea8", marginTop: "10px" }}>
          Process path: Qualification → Audit → Test → Proposal.
        </div>
      )}
    </form>
  );
}

const PANEL: CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "18px",
  padding: "18px",
  marginBottom: "16px",
};

/**
 * SKU launch form panel for the product card (#218) — expands as a separate frosted panel
 * ABOVE the metrics row, with the header icon "Launch new SKU to client". Controlled from
 * outside (`open`/`onClose`) by the card's client-side header. Process path: Qualification
 * → Audit → Test → Proposal.
 */
export function LaunchSkuFormPanel({
  open,
  onClose,
  productId,
  clients,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly productId: string;
  readonly clients: readonly ClientOption[];
}) {
  if (!open) return null;
  return (
    <div style={PANEL}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <span
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "8px",
            background: "var(--accent)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </span>
        <span style={{ font: "600 14px Arial" }}>Launch new SKU to client</span>
      </div>
      <LaunchSkuFormFields
        productId={productId}
        clients={clients}
        onDone={onClose}
        onCancel={onClose}
      />
    </div>
  );
}

/**
 * Dark trigger button "Schedule launch to client" for the product card header — inline
 * style from the design reference (dark pill, radius 24). Opening/closing the form is
 * delegated outward via `onClick` so the form can expand as a separate panel
 * (LaunchSkuFormPanel).
 */
export function LaunchSkuHeaderButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={DARK_PILL}>
      Schedule launch to client
    </button>
  );
}

/**
 * "Schedule launch to client" button for a CATALOG ROW (#218): self-contained — opens a
 * mini client-selection form right in the row expansion → creates a task at the
 * qualification stage with the new_sku goal. Process path: Qualification → Audit → Test →
 * Proposal. The server action and logic are unchanged; only the presentation differs.
 */
export function LaunchSkuButton({ productId, clients }: LaunchSkuButtonProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} style={ROW_ACTION_BTN}>
        Schedule SKU launch
      </button>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <LaunchSkuFormFields
        productId={productId}
        clients={clients}
        onDone={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}
