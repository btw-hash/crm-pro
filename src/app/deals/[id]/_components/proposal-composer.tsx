"use client";

import { useActionState, useRef, useState } from "react";
import {
  buildProposalAction,
  respondToProposalAction,
  saveProposalAction,
  saveProposalActivityAction,
  type ProposalView,
} from "../actions";

interface ProductOption {
  readonly id: string;
  readonly name: string;
  /** Suggested retail price in USD used to prefill the line price (0 if the product has no price). */
  readonly price: number;
}

interface LineState {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  unit: string;
}

type Mode = "build" | "ready" | "sent";

const UNITS = ["kg", "pcs", "l"] as const;

function fmtUsd(dollars: number): string {
  return "$" + new Intl.NumberFormat("en-US").format(Math.round(dollars));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function exportToPdf(view: ProposalView, prose: string, docNo: string, today: string): boolean {
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return false;
  const rows = view.lines
    .map(
      (l) =>
        `<tr><td>${escapeHtml(l.productName)}</td>` +
        `<td>${escapeHtml(l.priceFmt ?? "—")}</td>` +
        `<td>${l.quantity} ${escapeHtml(l.unit)}</td>` +
        `<td>${escapeHtml(l.lineTotalFmt ?? "—")}</td></tr>`,
    )
    .join("");
  const totalRow =
    `<tr><td colspan="3"><b>Total</b></td>` +
    `<td><b>${escapeHtml(view.totalFmt ?? "—")}</b></td></tr>`;
  win.document.write(
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<title>Proposal — ${escapeHtml(view.clientName)}</title><style>` +
      `body{font-family:system-ui,-apple-system,"Segoe UI",Arial,sans-serif;color:#222;padding:32px;max-width:720px;margin:0 auto}` +
      `h1{font-size:20px;margin:0 0 14px}table{border-collapse:collapse;width:100%;margin:12px 0}` +
      `td,th{border:1px solid #ddd;padding:7px 10px;text-align:left;font-size:14px}th{background:#f3f6f9}` +
      `.prose{white-space:pre-wrap;line-height:1.55;margin-top:18px}` +
      `.muted{color:#777;font-size:13px}` +
      `@media print{body{padding:0}}</style></head><body>` +
      `<h1>Proposal</h1>` +
      `<div><b>No. ${escapeHtml(docNo)}</b> · ${escapeHtml(today)}</div>` +
      `<div style="margin-top:6px"><b>To:</b> ${escapeHtml(view.clientName)}</div>` +
      `<table><tr><th>Item</th><th>Price</th><th>Quantity</th><th>Total</th></tr>` +
      rows +
      totalRow +
      `</table>` +
      `<div class="prose">${escapeHtml(prose)}</div>` +
      `<div class="muted" style="margin-top:18px">Prices valid for 14 days · Sales tax included.</div>` +
      `</body></html>`,
  );
  win.document.close();
  win.focus();
  win.print();
  return true;
}

export function ProposalComposer({
  dealId,
  clientId,
  products,
}: {
  dealId: string;
  clientId: string;
  products: readonly ProductOption[];
}) {
  const defaultProduct = products[0];
  const defaultLine = (): LineState => ({
    productId: defaultProduct?.id ?? "",
    productName: defaultProduct?.name ?? "",
    price: defaultProduct?.price ?? 0,
    quantity: 1000,
    unit: "kg",
  });

  const [lines, setLines] = useState<LineState[]>([defaultLine()]);
  const [mode, setMode] = useState<Mode>("build");
  const [revision, setRevision] = useState(1);
  const [view, setView] = useState<ProposalView | null>(null);
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildPending, setBuildPending] = useState(false);
  const [exported, setExported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const proseRef = useRef<HTMLTextAreaElement>(null);

  const [respondState, respondAction, respondPending] = useActionState(
    respondToProposalAction,
    null,
  );

  const docNo = `PROP-2026-${String(dealId).slice(-4).padStart(4, "0")}`;
  const today = new Date().toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  function updateLine(index: number, patch: Partial<LineState>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, defaultLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  function lineTotal(l: LineState): number {
    return l.price * l.quantity;
  }

  const grandTotal = lines.reduce((s, l) => s + lineTotal(l), 0);

  /**
   * Persists the assembled proposal in a structured form (lines + prose + status),
   * upserted by dealId. Called on assembly (draft) and on send (sent) — so that once
   * the deal is "Completed" the proposal is available as a document and prefills the
   * "Purchase order (ERP)".
   */
  async function persistProposal(status: "draft" | "sent", proseText: string): Promise<boolean> {
    const fd = new FormData();
    fd.set("dealId", dealId);
    fd.set("clientId", clientId);
    fd.set("status", status);
    fd.set("revision", String(revision));
    fd.set("prose", proseText);
    fd.set(
      "items",
      JSON.stringify(
        lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          unit: l.unit,
          quantity: l.quantity,
          price: l.price,
        })),
      ),
    );
    const res = await saveProposalAction(fd);
    return res.ok;
  }

  async function handleBuild() {
    setBuildError(null);
    if (lines.length === 0) {
      setBuildError("Add at least one line item.");
      return;
    }
    for (const l of lines) {
      if (l.quantity <= 0) {
        setBuildError("Quantity must be greater than zero.");
        return;
      }
    }
    setBuildPending(true);
    const fd = new FormData();
    fd.set("dealId", dealId);
    fd.set(
      "items",
      JSON.stringify(
        lines.map((l) => ({
          productId: l.productId,
          productName: l.productName,
          unit: l.unit,
          quantity: l.quantity,
          price: l.price,
        })),
      ),
    );
    const result = await buildProposalAction(fd);
    setBuildPending(false);
    if (result.ok) {
      setView(result.view);
      setMode("ready");
      setExported(false);
      setSaved(false);
      setSaveError(null);
      // Persist the proposal draft (lines + prose) right away — so it's available once "Completed".
      void persistProposal("draft", result.view.prose);
    } else {
      setBuildError(result.error);
    }
  }

  async function handleSave() {
    if (!view) return;
    setSaving(true);
    setSaveError(null);
    const prose = proseRef.current?.value ?? view.prose;
    const linesSummary = lines.map((l) => `${l.productName} ${l.quantity} ${l.unit}`).join(", ");
    const summary =
      `Proposal (rev. #${revision}): ${linesSummary}. ` +
      (view.totalFmt ? `Total ${view.totalFmt}. ` : "");
    const fd = new FormData();
    fd.set("dealId", dealId);
    fd.set("clientId", clientId);
    fd.set("summary", `${summary}\n\n${prose}`);
    try {
      await saveProposalActivityAction(fd);
      await persistProposal("draft", prose);
      setSaved(true);
    } catch {
      setSaveError("Could not save the proposal to the timeline. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (mode === "build") {
    const isRevised = revision > 1;
    return (
      <div>
        {isRevised ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "rgba(251,241,214,0.6)",
              border: "1px solid #ecd9a4",
              borderRadius: 12,
              padding: "10px 13px",
              marginBottom: 14,
              font: "500 12.5px Arial",
              color: "#9a6a00",
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            The client asked for revisions — revision #{revision}. Update the line items or prices
            and rebuild the proposal.
          </div>
        ) : null}

        <div
          style={{
            font: "600 11px Arial",
            color: "#9a9ea8",
            letterSpacing: ".5px",
            marginBottom: 9,
          }}
        >
          PROPOSAL LINE ITEMS
        </div>

        <div
          style={{
            border: "1px solid rgba(120,130,150,0.16)",
            borderRadius: 13,
            background: "rgba(255,255,255,0.4)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 12px",
              background: "rgba(247,242,236,0.65)",
              font: "700 10px Arial",
              color: "#8b90a0",
              letterSpacing: ".3px",
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>PRODUCT</span>
            <span style={{ width: 90, textAlign: "right" }}>PRICE, $</span>
            <span style={{ width: 72, textAlign: "right" }}>QTY</span>
            <span style={{ width: 54 }}>UNIT</span>
            <span style={{ width: 88, textAlign: "right" }}>TOTAL</span>
            <span style={{ width: 24 }} />
          </div>

          {lines.map((line, i) => (
            <div key={i} style={{ borderTop: "1px solid #f1ece5", padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <select
                  value={line.productId}
                  onChange={(e) => {
                    const opt = products.find((p) => p.id === e.target.value);
                    updateLine(i, {
                      productId: e.target.value,
                      productName: opt?.name ?? e.target.value,
                      // Prefill the price from the selected product's suggested price (#462 §4.1); editable by hand.
                      price: opt?.price ?? 0,
                    });
                  }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: "1px solid #e8e1d9",
                    borderRadius: 9,
                    padding: "8px 8px",
                    font: "500 12.5px Arial",
                    background: "#fff",
                    color: "#16181d",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min="0"
                  step="1"
                  value={line.price}
                  onChange={(e) => updateLine(i, { price: Math.max(0, Number(e.target.value)) })}
                  title="Unit price, $"
                  style={{
                    width: 90,
                    boxSizing: "border-box",
                    border: "1px solid #e8e1d9",
                    borderRadius: 9,
                    padding: "8px 8px",
                    font: "600 12.5px Arial",
                    background: "#fff",
                    color: "#16181d",
                    outline: "none",
                    textAlign: "right",
                  }}
                />

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: Math.max(1, Number(e.target.value)) })}
                  title="Quantity"
                  style={{
                    width: 72,
                    boxSizing: "border-box",
                    border: "1px solid #e8e1d9",
                    borderRadius: 9,
                    padding: "8px 8px",
                    font: "600 12.5px Arial",
                    background: "#fff",
                    color: "#16181d",
                    outline: "none",
                    textAlign: "right",
                  }}
                />

                <select
                  value={line.unit}
                  onChange={(e) => updateLine(i, { unit: e.target.value })}
                  title="Unit of measure"
                  style={{
                    width: 54,
                    boxSizing: "border-box",
                    border: "1px solid #e8e1d9",
                    borderRadius: 9,
                    padding: "8px 4px",
                    font: "500 12.5px Arial",
                    background: "#fff",
                    color: "#16181d",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>

                <span
                  style={{
                    width: 88,
                    flexShrink: 0,
                    textAlign: "right",
                    font: "700 13px Arial",
                    color: "#16181d",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtUsd(lineTotal(line))}
                </span>

                <span
                  style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}
                >
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      title="Remove line item"
                      style={{
                        width: 24,
                        height: 24,
                        border: "1px solid #e8e1d9",
                        background: "#fff",
                        color: "#9a9ea8",
                        borderRadius: 7,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
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
                  ) : null}
                </span>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addLine}
          style={{
            marginTop: 10,
            border: "1px dashed #d9d2c8",
            background: "rgba(255,255,255,0.4)",
            color: "#6b6f78",
            font: "600 12.5px Arial",
            padding: "9px 14px",
            borderRadius: 10,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add line item
        </button>

        {buildError ? (
          <p className="error" style={{ marginTop: 10 }}>
            {buildError}
          </p>
        ) : null}

        <div
          style={{
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => void handleBuild()}
            disabled={buildPending}
            style={{
              border: "none",
              background:
                "radial-gradient(120% 150% at 100% 0%, rgba(231,186,60,0.40) 0%, transparent 62%), linear-gradient(150deg,#2a2f3b 0%,#14171f 100%)",
              color: "#fff",
              font: "600 13px Arial",
              padding: "12px 22px",
              borderRadius: 999,
              cursor: buildPending ? "default" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              opacity: buildPending ? 0.7 : 1,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9.5 3 11 7.5 15.5 9 11 10.5 9.5 15 8 10.5 3.5 9 8 7.5z" />
              <path d="m17.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" />
            </svg>
            {buildPending ? "AI is building the proposal…" : "Build proposal (AI)"}
          </button>
          <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
            Total:{" "}
            <strong style={{ color: "#16181d", fontWeight: 700 }}>{fmtUsd(grandTotal)}</strong>
            {" · "}
            {lines.length} {lines.length === 1 ? "line item" : "line items"}
          </span>
        </div>

        {buildPending ? (
          <div
            style={{
              marginTop: 12,
              background:
                "radial-gradient(135% 122% at 100% -4%, rgba(231,186,60,0.40) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 12,
              padding: "12px 14px",
              color: "#fff",
              font: "500 12.5px Arial",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#E3B32B",
                flexShrink: 0,
              }}
            />
            AI is building the document: drafting the cover text…
          </div>
        ) : null}
      </div>
    );
  }

  if (mode === "ready" && view) {
    return (
      <div>
        <div
          style={{
            border: "1px solid #e7e0d7",
            borderRadius: 16,
            background: "#fffdfb",
            boxShadow: "0 14px 40px rgba(31,45,80,0.10)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "17px 20px",
              borderBottom: "1px solid #f1ece5",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "#BF322B",
                  color: "#fff",
                  font: "800 17px Arial",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                M
              </span>
              <div>
                <div style={{ font: "700 15px Arial", color: "#16181d" }}>Proposal</div>
                <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>
                  No. {docNo} · {today}
                </div>
              </div>
            </div>
            <span
              style={{
                font: "600 11px Arial",
                color: "#9a6a00",
                background: "#fbf1d6",
                borderRadius: 999,
                padding: "5px 11px",
                whiteSpace: "nowrap",
              }}
            >
              draft · revision #{revision}
            </span>
          </div>

          <div style={{ padding: "18px 20px" }}>
            <div
              style={{
                display: "flex",
                gap: 28,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ font: "400 10.5px Arial", color: "#9a9ea8", marginBottom: 3 }}>
                  To
                </div>
                <div style={{ font: "700 14px Arial", color: "#16181d" }}>{view.clientName}</div>
              </div>
              <div>
                <div style={{ font: "400 10.5px Arial", color: "#9a9ea8", marginBottom: 3 }}>
                  From
                </div>
                <div style={{ font: "600 14px Arial", color: "#16181d" }}>Millbrook Foods</div>
              </div>
            </div>

            <div
              style={{
                border: "1px solid #f0eae2",
                borderRadius: 11,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 14px",
                  background: "#f7f2ec",
                  font: "700 10px Arial",
                  color: "#8b90a0",
                  letterSpacing: ".4px",
                }}
              >
                <span style={{ flex: 1 }}>ITEM</span>
                <span style={{ width: 92, textAlign: "right" }}>PRICE</span>
                <span style={{ width: 92, textAlign: "right" }}>QTY</span>
                <span style={{ width: 104, textAlign: "right" }}>TOTAL</span>
              </div>
              {view.lines.map((l, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "11px 14px",
                    borderTop: "1px solid #f4efe8",
                  }}
                >
                  <span style={{ flex: 1, font: "600 13px Arial", color: "#16181d" }}>
                    {l.productName}
                  </span>
                  <span
                    style={{
                      width: 92,
                      textAlign: "right",
                      font: "400 13px Arial",
                      color: "#6b6f78",
                    }}
                  >
                    {l.priceFmt ?? "—"}
                  </span>
                  <span
                    style={{
                      width: 92,
                      textAlign: "right",
                      font: "400 13px Arial",
                      color: "#6b6f78",
                    }}
                  >
                    {l.quantity}&nbsp;{l.unit}
                  </span>
                  <span
                    style={{
                      width: 104,
                      textAlign: "right",
                      font: "700 13px Arial",
                      color: "#16181d",
                    }}
                  >
                    {l.lineTotalFmt ?? "—"}
                  </span>
                </div>
              ))}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "12px 14px",
                  borderTop: "1.5px solid #ece4da",
                  background: "#faf6f1",
                }}
              >
                <span style={{ flex: 1, font: "700 13px Arial", color: "#16181d" }}>Total</span>
                <span style={{ width: 92 }} />
                <span style={{ width: 92 }} />
                <span
                  style={{
                    width: 104,
                    textAlign: "right",
                    font: "800 15px Arial",
                    color: "#16181d",
                  }}
                >
                  {view.totalFmt ?? "—"}
                </span>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                font: "400 13px/1.6 Arial",
                color: "#33373f",
                whiteSpace: "pre-wrap",
              }}
            >
              {proseRef.current?.value ?? view.prose}
            </div>

            <div
              style={{
                marginTop: 16,
                paddingTop: 13,
                borderTop: "1px solid #f1ece5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <span style={{ font: "400 11px Arial", color: "#9a9ea8" }}>
                Prices valid for 14 days · Sales tax included.
              </span>
              <span style={{ font: "600 12px Arial", color: "#16181d" }}>Millbrook Foods</span>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 13 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: 7,
                background:
                  "radial-gradient(120% 150% at 100% 0%, rgba(231,186,60,0.40) 0%, transparent 62%), linear-gradient(150deg,#2a2f3b 0%,#14171f 100%)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9.5 3 11 7.5 15.5 9 11 10.5 9.5 15 8 10.5 3.5 9 8 7.5z" />
              </svg>
            </span>
            <span style={{ font: "600 12px Arial", color: "#16181d" }}>Cover text — AI draft</span>
            <span style={{ marginLeft: "auto", font: "400 11px Arial", color: "#9a9ea8" }}>
              edits apply to the document
            </span>
          </div>
          <textarea
            ref={proseRef}
            defaultValue={view.prose}
            rows={5}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #e8e1d9",
              borderRadius: 11,
              padding: "11px 12px",
              font: "400 13px/1.55 Arial",
              background: "#fff",
              color: "#16181d",
              outline: "none",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 15,
            display: "flex",
            alignItems: "center",
            gap: 9,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={() => {
              // Send to client → persist the proposal with status "sent" (current textarea text).
              void persistProposal("sent", proseRef.current?.value ?? view.prose);
              setMode("sent");
            }}
            style={{
              border: "none",
              background: "var(--accent, #BF322B)",
              color: "#fff",
              font: "600 13px Arial",
              padding: "11px 20px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
            Send to client
          </button>

          <button
            type="button"
            onClick={() => {
              const ok = exportToPdf(view, proseRef.current?.value ?? view.prose, docNo, today);
              if (!ok) {
                setBuildError("Allow pop-ups to export the proposal to PDF.");
              } else {
                setExported(true);
              }
            }}
            style={{
              border: "1px solid #e8e1d9",
              background: "#fff",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "11px 16px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="M7 10l5 5 5-5" />
              <path d="M12 15V3" />
            </svg>
            {exported ? "Exported ✓" : "Export to PDF"}
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saved || saving}
            style={{
              border: "1px solid #e8e1d9",
              background: "#fff",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "11px 16px",
              borderRadius: 999,
              cursor: saved || saving ? "default" : "pointer",
              opacity: saved || saving ? 0.65 : 1,
            }}
          >
            {saved ? "Saved to timeline ✓" : saving ? "Saving…" : "Save to timeline"}
          </button>

          <button
            type="button"
            onClick={() => setMode("build")}
            style={{
              border: "1px solid #d9d2c8",
              background: "#fff",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "11px 16px",
              borderRadius: 999,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        </div>

        {saveError ? (
          <p className="error" style={{ marginTop: 8 }}>
            {saveError}
          </p>
        ) : null}
        {buildError ? (
          <p className="error" style={{ marginTop: 8 }}>
            {buildError}
          </p>
        ) : null}
      </div>
    );
  }

  if (mode === "sent" && view) {
    return (
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(231,238,249,0.5)",
            border: "1px solid #c4d4ea",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 15,
          }}
        >
          <span
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: 11,
              background: "#e7eef9",
              color: "#2f5fb0",
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "600 13.5px Arial", color: "#16181d" }}>
              Proposal sent to client · revision #{revision}
            </div>
            <div style={{ font: "400 12px Arial", color: "#6b6f78", marginTop: 2 }}>
              {view.clientName} · {view.totalFmt ?? "—"} · awaiting response
            </div>
          </div>
        </div>

        <div
          style={{
            font: "600 11px Arial",
            color: "#9a9ea8",
            letterSpacing: ".5px",
            marginBottom: 10,
          }}
        >
          CLIENT RESPONSE
        </div>

        <form action={respondAction}>
          <input type="hidden" name="dealId" value={dealId} />
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              type="submit"
              name="response"
              value="approved"
              disabled={respondPending}
              style={{
                border: "none",
                background: "#197a48",
                color: "#fff",
                font: "600 13px Arial",
                padding: "11px 18px",
                borderRadius: 999,
                cursor: respondPending ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                opacity: respondPending ? 0.7 : 1,
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Approved
            </button>

            <button
              type="button"
              disabled={respondPending}
              onClick={() => {
                setRevision((r) => r + 1);
                setMode("build");
              }}
              style={{
                border: "1px solid #e6c98a",
                background: "#fbf1d6",
                color: "#9a6a00",
                font: "600 13px Arial",
                padding: "11px 18px",
                borderRadius: 999,
                cursor: respondPending ? "default" : "pointer",
                opacity: respondPending ? 0.7 : 1,
              }}
            >
              Needs revision
            </button>

            <button
              type="submit"
              name="response"
              value="declined"
              disabled={respondPending}
              style={{
                border: "1px solid #e9bdb8",
                background: "#fff",
                color: "var(--accent, #BF322B)",
                font: "600 13px Arial",
                padding: "11px 18px",
                borderRadius: 999,
                cursor: respondPending ? "default" : "pointer",
                opacity: respondPending ? 0.7 : 1,
              }}
            >
              Client declined
            </button>
          </div>
        </form>

        {respondState && !respondState.ok ? (
          <p className="error" style={{ marginTop: 8 }}>
            {respondState.error}
          </p>
        ) : null}

        <p style={{ font: "400 11.5px/1.45 Arial", color: "#9a9ea8", marginTop: 11 }}>
          "Approved" moves the deal to order processing, "Declined" closes it as lost, "Needs
          revision" returns to building a new revision.
        </p>

        <button
          type="button"
          onClick={() => setMode("ready")}
          style={{
            marginTop: 12,
            border: "none",
            background: "none",
            color: "#6b6f78",
            font: "600 12.5px Arial",
            padding: 0,
            cursor: "pointer",
          }}
        >
          ← View proposal
        </button>
      </div>
    );
  }

  return null;
}
