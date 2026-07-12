"use client";

import { useActionState, useState } from "react";
import type { ClientBalanceView } from "@/application/use-cases/get-client-balance-view";
import { placeOrderAction } from "../actions";

interface ProductOption {
  readonly id: string;
  readonly name: string;
}

/** A proposal line for prefilling the order (from the saved proposal, #462 §4.2). */
interface PrefillLine {
  readonly productId: string;
  readonly productName: string;
  readonly unit: string;
  readonly quantity: number;
}

interface LineState {
  productId: string;
  quantity: number;
  unit: string;
}

const FIELD: React.CSSProperties = {
  border: "1px solid #e8e1d9",
  borderRadius: 9,
  padding: "8px 8px",
  font: "500 13px Arial",
  background: "#fff",
  color: "#16181d",
  outline: "none",
  boxSizing: "border-box",
};

/**
 * Creates a "Customer order" in the ERP from a completed deal. Lines are prefilled from
 * the saved proposal (#462 §4.2), editable in composition/quantity; if there's no proposal
 * — a single blank line. The order is created through the ErpGateway port (currently a
 * stub; real ERP after the anonymized copy is wired up, #1). The client balance (AR/limit)
 * is shown before placing the order; an order "on credit" beyond the limit is blocked (#34).
 */
export function OrderComposer({
  dealId,
  products,
  balance,
  prefillLines,
}: {
  dealId: string;
  products: readonly ProductOption[];
  balance: ClientBalanceView | null;
  prefillLines?: readonly PrefillLine[];
}) {
  const [state, action, pending] = useActionState(placeOrderAction, null);
  const firstProduct = products[0];
  const blankLine = (): LineState => ({
    productId: firstProduct?.id ?? "",
    quantity: 500,
    unit: "kg",
  });
  const [lines, setLines] = useState<LineState[]>(
    prefillLines && prefillLines.length > 0
      ? prefillLines.map((l) => ({ productId: l.productId, quantity: l.quantity, unit: l.unit }))
      : [blankLine()],
  );

  if (state?.ok) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          maxWidth: 460,
          marginBottom: 20,
          background: "rgba(228,241,232,0.55)",
          border: "1px solid #b7ddc5",
          borderRadius: 14,
          padding: "14px 16px",
        }}
      >
        <span
          style={{
            width: 38,
            height: 38,
            flexShrink: 0,
            borderRadius: 11,
            background: "#e0efe6",
            color: "#197a48",
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
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div style={{ minWidth: 0 }}>
          <strong style={{ font: "700 13.5px Arial", color: "#16181d" }}>
            {state.idempotent
              ? `An order for this process already exists in the ERP: № ${state.orderNumber}.`
              : `Customer order created in the ERP: № ${state.orderNumber}.`}
          </strong>
          <p style={{ margin: "4px 0 0", font: "400 12px/1.5 Arial", color: "#6b6f78" }}>
            {state.idempotent
              ? "Resubmitting didn't create a duplicate — the existing order was returned (idempotency)."
              : "Demo: the number was issued by an ERP stub. A real order in the ERP is created once the ERP is connected (#1)."}
          </p>
        </div>
      </div>
    );
  }

  const overLimit = state && !state.ok && state.overLimit === true;
  const prefilled = Boolean(prefillLines && prefillLines.length > 0);

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLine() {
    setLines((prev) => [...prev, blankLine()]);
  }
  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  const linesJson = JSON.stringify(
    lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
  );

  return (
    <form
      action={action}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 460,
        marginBottom: 20,
      }}
    >
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="lines" value={linesJson} />

      {balance ? (
        <p
          style={{
            margin: 0,
            font: "400 12px Arial",
            // Limit exceeded — accent red (a number signal), otherwise a muted caption.
            color: balance.isOverLimit ? "var(--accent, #BF322B)" : "#9a9ea8",
          }}
        >
          Credit limit: available{" "}
          <strong style={{ color: "#16181d", fontWeight: 700 }}>{balance.available}</strong> · AR{" "}
          {balance.debt} of {balance.creditLimit}
          {balance.isOverLimit ? " — limit already exceeded" : ""}
        </p>
      ) : null}

      {prefilled ? (
        <p style={{ margin: 0, font: "400 12px Arial", color: "#9a9ea8" }}>
          Lines are prefilled from the proposal — adjust composition or quantity if needed.
        </p>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <select
              value={line.productId}
              onChange={(e) => updateLine(i, { productId: e.target.value })}
              style={{ ...FIELD, flex: 1, minWidth: 0, cursor: "pointer" }}
              aria-label="Product"
            >
              <option value="" disabled>
                — select a product —
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="1"
              step="1"
              max="1000000"
              value={line.quantity}
              onChange={(e) => updateLine(i, { quantity: Math.max(0, Number(e.target.value)) })}
              aria-label="Quantity"
              style={{ ...FIELD, width: 96, textAlign: "right", font: "600 13px Arial" }}
            />

            <span style={{ width: 34, font: "500 12px Arial", color: "#9a9ea8", flexShrink: 0 }}>
              {line.unit}
            </span>

            <button
              type="button"
              onClick={() => removeLine(i)}
              disabled={lines.length <= 1}
              title="Remove line"
              style={{
                width: 30,
                height: 30,
                flexShrink: 0,
                border: "1px solid #e8e1d9",
                background: "#fff",
                color: lines.length <= 1 ? "#d4d0c9" : "#9a9ea8",
                borderRadius: 8,
                cursor: lines.length <= 1 ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLine}
        style={{
          alignSelf: "flex-start",
          marginTop: 2,
          border: "1px dashed #d9d2c8",
          background: "rgba(255,255,255,0.4)",
          color: "#6b6f78",
          font: "600 12.5px Arial",
          padding: "8px 13px",
          borderRadius: 10,
          cursor: "pointer",
        }}
      >
        + Add line
      </button>

      <label style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 2 }}>
        <span style={{ font: "400 11px Arial", color: "#9a9ea8" }}>Shipment date</span>
        <input
          name="shipmentDate"
          type="date"
          required
          style={{ ...FIELD, maxWidth: 200, cursor: "pointer" }}
        />
      </label>

      {state && !state.ok ? (
        <p style={{ margin: 0, font: "500 12px Arial", color: "var(--accent, #BF322B)" }}>
          {state.error}
        </p>
      ) : null}

      {overLimit ? (
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            font: "500 12.5px/1.45 Arial",
            color: "var(--accent, #BF322B)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            name="allowOverLimit"
            style={{ marginTop: 2, accentColor: "var(--accent, #BF322B)", cursor: "pointer" }}
          />
          <span>Place the order over the credit limit (at your own responsibility — logged)</span>
        </label>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        style={{
          alignSelf: "flex-start",
          marginTop: 2,
          border: "none",
          background: "#1c1f27",
          color: "#fff",
          font: "600 13px Arial",
          padding: "12px 22px",
          borderRadius: 999,
          cursor: pending ? "default" : "pointer",
          opacity: pending ? 0.7 : 1,
        }}
      >
        {pending ? "Creating order…" : overLimit ? "Create order anyway" : "Create order in ERP"}
      </button>
    </form>
  );
}
