"use client";

import { useActionState, useState } from "react";
import { saveQualificationAction } from "../actions";
import type { DealQualification } from "@/domain/deal/deal-qualification";

interface SubstepProps {
  index: number;
  title: string;
  isDone: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Substep({ index, title, isDone, open, onToggle, children }: SubstepProps) {
  // Step-number circle (design ref, CRM-PRO.dc.html:2632):
  //   done → green #197a48 with a white checkmark;
  //   current, expanded (not yet done) → dark #1c1f27 with a white digit (highlights the current step);
  //   others → gray rgba(120,130,150,0.14) with a gray digit #6b6f78.
  const numBg = isDone ? "#197a48" : open ? "#1c1f27" : "rgba(120,130,150,0.14)";
  const numColor = isDone || open ? "#fff" : "#6b6f78";

  return (
    <div
      style={{
        border: "1px solid rgba(120,130,150,0.16)",
        borderRadius: 13,
        marginBottom: 9,
        overflow: "hidden",
        background: "rgba(255,255,255,0.4)",
      }}
    >
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "13px 14px",
          cursor: "pointer",
        }}
      >
        <span
          style={{
            width: 24,
            height: 24,
            flexShrink: 0,
            borderRadius: 7,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "700 12px Arial",
            background: numBg,
            color: numColor,
          }}
        >
          {isDone ? (
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          ) : (
            String(index)
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0, font: "600 13.5px Arial", color: "#16181d" }}>
          {title}
        </span>
        <span style={{ flexShrink: 0, font: "400 13px Arial", color: "#9aa0ad" }}>
          {open ? "▾" : "▸"}
        </span>
      </div>
      {open ? <div style={{ padding: "0 14px 15px" }}>{children}</div> : null}
    </div>
  );
}

const FIELD_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #e8e1d9",
  borderRadius: 10,
  padding: "9px 11px",
  font: "400 13px Arial",
  background: "#fff",
  color: "#16181d",
  outline: "none",
};

const LABEL_STYLE: React.CSSProperties = {
  font: "400 11px Arial",
  color: "#9a9ea8",
  marginBottom: 5,
  display: "block",
};

const SAVE_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 12.5px Arial",
  padding: "9px 17px",
  borderRadius: 999,
  cursor: "pointer",
  marginTop: 14,
};

const SAVE_BTN_DISABLED: React.CSSProperties = {
  ...SAVE_BTN,
  opacity: 0.6,
  cursor: "default",
};

// Urgency: order and color scale match the design (low→green, medium→ochre, high→red).
const URGENCY_OPTIONS = [
  { label: "Low", bg: "#e7f5ee", color: "#197a48", border: "#bfe6d1" },
  { label: "Medium", bg: "#fbf1d6", color: "#9a6a00", border: "#ecdcae" },
  { label: "High", bg: "#f7e4e2", color: "#BF322B", border: "#efc9c5" },
] as const;

// Demo recognition of a "company profile card": deterministic values (not from AI —
// a simulation of what OCR+LLM would return in production; a human reviews and saves).
const RECOGNIZED_DOC = {
  segment: "Confectionery production",
  productionScale: "Mid-size shop, 2 lines",
  needTask:
    "Replace an imported dough improver with a local equivalent without losing dough quality",
  targetProduct: "Improver P500",
  volumeHint: "~4 t/mo",
  urgency: "Medium",
  volumePerMonth: "≈ 4 t/mo",
  revenuePotential: "$65,000/yr",
} as const;

export function QualificationWorkspace({
  dealId,
  existing,
}: {
  dealId: string;
  existing: DealQualification | null;
}) {
  const q = existing;

  const [state, action, pending] = useActionState(saveQualificationAction, null);

  // Controlled fields — so "Recognize document" / "Dictate" can auto-fill them.
  const [form, setForm] = useState({
    segment: q?.segment ?? "",
    productionScale: q?.productionScale ?? "",
    needTask: q?.needTask ?? "",
    targetProduct: q?.targetProduct ?? "",
    volumeHint: q?.volumeHint ?? "",
    urgency: q?.urgency ?? "",
    decisionMaker: q?.decisionMaker ?? "",
    contactPerson: q?.contactPerson ?? "",
    volumePerMonth: q?.volumePerMonth ?? "",
    revenuePotential: q?.revenuePotential ?? "",
    paymentTerms: q?.paymentTerms ?? "",
    creditLimitHint: q?.creditLimitHint ?? "",
  });
  const set =
    (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Accordion: one step open at a time (the first one by default).
  const [openIndex, setOpenIndex] = useState<number>(1);
  const toggle = (i: number) => setOpenIndex((cur) => (cur === i ? 0 : i));

  const [docState, setDocState] = useState<"idle" | "reading" | "done">("idle");
  const recognizeDoc = () => {
    if (docState === "reading") return;
    setDocState("reading");
    setTimeout(() => {
      setForm((f) => ({ ...f, ...RECOGNIZED_DOC }));
      setDocState("done");
    }, 900);
  };

  const [dictating, setDictating] = useState(false);
  const dictateNeed = () => {
    if (dictating) return;
    setDictating(true);
    setTimeout(() => {
      setForm((f) => ({
        ...f,
        needTask:
          "The client complains about dough instability when switching to domestic raw materials — needs an improver that keeps the crumb volume and structure.",
      }));
      setDictating(false);
    }, 1300);
  };

  const hasSegment = Boolean(form.segment || form.productionScale);
  const hasNeed = Boolean(form.needTask || form.targetProduct || form.volumeHint || form.urgency);
  const hasLpr = Boolean(form.decisionMaker || form.contactPerson);
  const hasPotential = Boolean(form.volumePerMonth || form.revenuePotential);
  const hasCredit = Boolean(form.paymentTerms || form.creditLimitHint);

  return (
    <div style={{ marginTop: 15 }}>
      {/* AI banner: demo recognition of the company profile card → auto-fill. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background:
            "radial-gradient(120% 150% at 100% 0%, var(--ai-glow) 0%, transparent 60%), linear-gradient(150deg,#2a2f3b 0%,#14171f 100%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: 14,
          padding: "13px 15px",
          color: "#fff",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            flexShrink: 0,
            borderRadius: 10,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.16)",
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M9 13l2 2 4-4" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "700 13px Arial" }}>Fill from document — AI</div>
          <div
            style={{
              font: "400 11.5px/1.4 Arial",
              color: "rgba(255,255,255,.66)",
              marginTop: 2,
            }}
          >
            A company profile card or brief — AI will recognize it and fill in the profile and
            potential.
          </div>
        </div>
        {docState === "done" ? (
          // Done state (design ref, CRM-PRO.dc.html:369): glassy dark-green badge on the
          // dark AI banner — not a button, a character checkmark without an SVG.
          <span
            style={{
              flexShrink: 0,
              background: "rgba(231,245,238,0.16)",
              border: "1px solid rgba(31,158,108,0.5)",
              color: "#9fe6c2",
              font: "600 11px Arial",
              padding: "7px 12px",
              borderRadius: 999,
              whiteSpace: "nowrap",
            }}
          >
            ✓ Recognized
          </span>
        ) : (
          <button
            type="button"
            onClick={recognizeDoc}
            disabled={docState === "reading"}
            style={{
              flexShrink: 0,
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              font: "600 12.5px Arial",
              padding: "9px 15px",
              borderRadius: 999,
              cursor: docState === "reading" ? "default" : "pointer",
              whiteSpace: "nowrap",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {/* reading — a functional loading state layered over the binary design:
                a demo simulation of OCR+LLM (~0.9s) until the badge is ready. */}
            {docState === "reading" ? "Recognizing…" : "Recognize document"}
          </button>
        )}
      </div>

      {state && !state.ok ? (
        <p style={{ color: "var(--accent)", font: "400 13px Arial", marginBottom: 10 }}>
          {state.error}
        </p>
      ) : null}

      {/* Substep 1 — Profile and segment */}
      <Substep
        index={1}
        title="Client profile and segment"
        isDone={hasSegment}
        open={openIndex === 1}
        onToggle={() => toggle(1)}
      >
        <form action={action}>
          <input type="hidden" name="dealId" value={dealId} />
          {q?.id ? <input type="hidden" name="qualificationId" value={q.id} /> : null}
          <label style={LABEL_STYLE}>Segment / industry</label>
          <input
            name="segment"
            value={form.segment}
            onChange={set("segment")}
            placeholder="E.g. confectionery production"
            style={{ ...FIELD_STYLE, marginBottom: 11 }}
          />
          <label style={LABEL_STYLE}>Production scale</label>
          <input
            name="productionScale"
            value={form.productionScale}
            onChange={set("productionScale")}
            placeholder="E.g. mid-size shop, 2 lines"
            style={FIELD_STYLE}
          />
          <button type="submit" style={pending ? SAVE_BTN_DISABLED : SAVE_BTN} disabled={pending}>
            {pending ? "Saving…" : "Done"}
          </button>
        </form>
      </Substep>

      {/* Substep 2 — Need and pain point */}
      <Substep
        index={2}
        title="Need and pain point"
        isDone={hasNeed}
        open={openIndex === 2}
        onToggle={() => toggle(2)}
      >
        <form action={action}>
          <input type="hidden" name="dealId" value={dealId} />
          {q?.id ? <input type="hidden" name="qualificationId" value={q.id} /> : null}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <label style={{ ...LABEL_STYLE, marginBottom: 0 }}>Task / pain point</label>
            <button
              type="button"
              onClick={dictateNeed}
              disabled={dictating}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "radial-gradient(120% 150% at 100% 0%, var(--ai-glow) 0%, transparent 62%), linear-gradient(150deg,#2a2f3b 0%,#14171f 100%)",
                color: "#fff",
                font: "600 10.5px Arial",
                padding: "5px 10px",
                borderRadius: 999,
                cursor: dictating ? "default" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
              {dictating ? "Listening…" : "Dictate"}
            </button>
          </div>
          <textarea
            name="needTask"
            value={form.needTask}
            onChange={set("needTask")}
            rows={2}
            placeholder="What the client needs solved"
            style={{
              ...FIELD_STYLE,
              font: "400 13px/1.45 Arial",
              resize: "vertical",
              marginBottom: 11,
            }}
          />
          <div
            className="r-stack"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11, marginBottom: 11 }}
          >
            <div>
              <label style={LABEL_STYLE}>Target product</label>
              <input
                name="targetProduct"
                value={form.targetProduct}
                onChange={set("targetProduct")}
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Volume estimate</label>
              <input
                name="volumeHint"
                value={form.volumeHint}
                onChange={set("volumeHint")}
                placeholder="~4 t/mo"
                style={FIELD_STYLE}
              />
            </div>
          </div>
          <label style={LABEL_STYLE}>Urgency</label>
          <div style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
            {URGENCY_OPTIONS.map((opt) => {
              const active = form.urgency === opt.label;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, urgency: active ? "" : opt.label }))}
                  style={{
                    border: `1.5px solid ${active ? opt.color : "#e8e1d9"}`,
                    background: active ? opt.bg : "#fff",
                    color: active ? opt.color : "#6b6f78",
                    font: "600 12px Arial",
                    padding: "7px 14px",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="urgency" value={form.urgency} />
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #ece6df" }}>
            <button type="submit" style={pending ? SAVE_BTN_DISABLED : SAVE_BTN} disabled={pending}>
              {pending ? "Saving…" : "Done"}
            </button>
          </div>
        </form>
      </Substep>

      {/* Substep 3 — Decision maker and contacts */}
      <Substep
        index={3}
        title="Decision maker and contacts"
        isDone={hasLpr}
        open={openIndex === 3}
        onToggle={() => toggle(3)}
      >
        <form action={action}>
          <input type="hidden" name="dealId" value={dealId} />
          {q?.id ? <input type="hidden" name="qualificationId" value={q.id} /> : null}
          <label style={LABEL_STYLE}>Decision maker / signatory</label>
          <input
            name="decisionMaker"
            value={form.decisionMaker}
            onChange={set("decisionMaker")}
            placeholder="Who makes the decision"
            style={{ ...FIELD_STYLE, marginBottom: 11 }}
          />
          <label style={LABEL_STYLE}>Point of contact (technologist / buyer)</label>
          <input
            name="contactPerson"
            value={form.contactPerson}
            onChange={set("contactPerson")}
            placeholder="Name · role · phone"
            style={FIELD_STYLE}
          />
          <button type="submit" style={pending ? SAVE_BTN_DISABLED : SAVE_BTN} disabled={pending}>
            {pending ? "Saving…" : "Done"}
          </button>
        </form>
      </Substep>

      {/* Substep 4 — Potential */}
      <Substep
        index={4}
        title="Potential"
        isDone={hasPotential}
        open={openIndex === 4}
        onToggle={() => toggle(4)}
      >
        <form action={action}>
          <input type="hidden" name="dealId" value={dealId} />
          {q?.id ? <input type="hidden" name="qualificationId" value={q.id} /> : null}
          <div
            className="r-stack"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}
          >
            <div>
              <label style={LABEL_STYLE}>Volume, t/mo</label>
              <input
                name="volumePerMonth"
                value={form.volumePerMonth}
                onChange={set("volumePerMonth")}
                placeholder="≈ 4 t/mo"
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Potential, $/yr</label>
              <input
                name="revenuePotential"
                value={form.revenuePotential}
                onChange={set("revenuePotential")}
                placeholder="$65,000/yr"
                style={FIELD_STYLE}
              />
            </div>
          </div>
          <button type="submit" style={pending ? SAVE_BTN_DISABLED : SAVE_BTN} disabled={pending}>
            {pending ? "Saving…" : "Done"}
          </button>
        </form>
      </Substep>

      {/* Substep 5 — Terms and credit risk */}
      <Substep
        index={5}
        title="Terms and credit risk"
        isDone={hasCredit}
        open={openIndex === 5}
        onToggle={() => toggle(5)}
      >
        <form action={action}>
          <input type="hidden" name="dealId" value={dealId} />
          {q?.id ? <input type="hidden" name="qualificationId" value={q.id} /> : null}
          <div
            className="r-stack"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 11 }}
          >
            <div>
              <label style={LABEL_STYLE}>Payment terms</label>
              <input
                name="paymentTerms"
                value={form.paymentTerms}
                onChange={set("paymentTerms")}
                placeholder="E.g. 14 days"
                style={FIELD_STYLE}
              />
            </div>
            <div>
              <label style={LABEL_STYLE}>Credit limit estimate</label>
              <input
                name="creditLimitHint"
                value={form.creditLimitHint}
                onChange={set("creditLimitHint")}
                placeholder="$17,000"
                style={FIELD_STYLE}
              />
            </div>
          </div>
          <button type="submit" style={pending ? SAVE_BTN_DISABLED : SAVE_BTN} disabled={pending}>
            {pending ? "Saving…" : "Done"}
          </button>
        </form>
      </Substep>
    </div>
  );
}
