"use client";

import { useState } from "react";

export interface ProductOption {
  readonly id: string;
  readonly name: string;
}

interface Line {
  readonly key: number;
  readonly productId: string;
  readonly quantity: string;
}

let lineCounter = 0;
function newLine(): Line {
  lineCounter += 1;
  return { key: lineCounter, productId: "", quantity: "2" };
}

/**
 * Multi-select of products with quantity (#0055): multiple "product + qty" lines.
 * Emits parallel fields name="productId" + name="quantity" for the server action (getAll).
 */
export function ProductLines({ products }: { products: readonly ProductOption[] }) {
  const [lines, setLines] = useState<readonly Line[]>([newLine()]);

  function update(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }
  function add() {
    setLines((prev) => [...prev, newLine()]);
  }
  function remove(key: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={{ font: "600 13px Arial", color: "#16181d" }}>Products</span>
      {lines.map((line) => (
        <div key={line.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select
            name="productId"
            value={line.productId}
            onChange={(e) => update(line.key, { productId: e.target.value })}
            style={{ flex: 2 }}
            required
          >
            <option value="" disabled>
              — select a product —
            </option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            name="quantity"
            type="number"
            step="0.1"
            min="0.1"
            value={line.quantity}
            onChange={(e) => update(line.key, { quantity: e.target.value })}
            style={{ width: 90 }}
            aria-label="Quantity (kg)"
          />
          <button
            type="button"
            onClick={() => remove(line.key)}
            disabled={lines.length === 1}
            aria-label="Remove line item"
            style={{
              border: "1px solid var(--border)",
              background: "#fff",
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: lines.length === 1 ? "default" : "pointer",
              opacity: lines.length === 1 ? 0.4 : 1,
            }}
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          alignSelf: "flex-start",
          border: "1px dashed var(--border)",
          background: "#fafcfe",
          borderRadius: 8,
          padding: "6px 12px",
          font: "600 12px Arial",
          color: "var(--accent)",
          cursor: "pointer",
        }}
      >
        + add product
      </button>
    </div>
  );
}
