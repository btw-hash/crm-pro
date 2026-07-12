"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import type { TechRequest, TechRequestStatus } from "@/domain/tech-request/tech-request";
import {
  CONSULT_FORMAT_LABELS,
  DEMO_LOCATION_LABELS,
  TECH_REQUEST_KIND_LABELS,
  TECH_REQUEST_STATUS_LABELS,
} from "@/domain/tech-request/tech-request";
import type { TestAct, TestActKind } from "@/domain/test-act/test-act";
import { TEST_ACT_KIND_LABELS } from "@/domain/test-act/test-act";
import type { TestActDraft } from "@/application/ports/ai-gateway";
import { useServerRecorder } from "@/app/deals/[id]/_components/use-server-recorder";
import {
  completeTechRequestAction,
  draftTechActFromVoiceAction,
  saveTestActAction,
  sendTestActAction,
  takeTechRequestAction,
} from "../actions";

// ── shared styles ────────────────────────────────────────────────────

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 6px",
  cursor: "pointer",
  borderRadius: 8,
};

const CELL: React.CSSProperties = { flex: 1, font: "500 13px Arial", color: "#16181d" };

const STATUS_TONE = {
  ok: { background: "#e7f5ee", color: "#197a48" },
  warn: { background: "#fbf1d6", color: "#9a6a00" },
  bad: { background: "#f7e4e2", color: "var(--accent)" },
  neu: { background: "#efe9e2", color: "#6a5f54" },
} as const;

function statusBadgeStyle(tone: keyof typeof STATUS_TONE): React.CSSProperties {
  return {
    ...STATUS_TONE[tone],
    font: "600 11px Arial",
    padding: "4px 10px",
    borderRadius: "999px",
    whiteSpace: "nowrap",
  };
}

/** Row status badge tone — shared with the popup (STATUS_PILL): open → accent. */
const ROW_STATUS_TONE: Record<TechRequestStatus, keyof typeof STATUS_TONE> = {
  open: "bad",
  in_progress: "warn",
  done: "ok",
};

/** Row action button (reference: dark, radius 9, flask icon). */
const ROW_ACTION_BTN: React.CSSProperties = {
  border: "none",
  background: "#1c1f27",
  color: "#fff",
  font: "600 12px Arial",
  padding: "8px 13px",
  borderRadius: 9,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

const INPUT: React.CSSProperties = {
  padding: "9px 11px",
  borderRadius: 10,
  border: "1px solid #e8e1d9",
  font: "400 13px Arial",
  background: "#fff",
  color: "#16181d",
  width: "100%",
  boxSizing: "border-box" as const,
};

const TEXTAREA: React.CSSProperties = { ...INPUT, resize: "vertical" as const };

// ── popup overlay ─────────────────────────────────────────────────────

function Popup({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.32)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 26px 70px rgba(31,45,80,0.26)",
          borderRadius: 20,
          padding: "22px 24px 24px",
          maxWidth: 560,
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          position: "relative",
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 22,
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "rgba(120,130,150,0.12)",
            color: "#6b6f78",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg
            width="17"
            height="17"
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
        {children}
      </div>
    </div>
  );
}

// ── info panel (request details, "TECH REQUEST" design) ─────────────

const INFO_CARD: React.CSSProperties = {
  flex: 1,
  minWidth: 130,
  background: "rgba(252,249,245,0.6)",
  border: "1px solid rgba(120,130,150,0.14)",
  borderRadius: 12,
  padding: "11px 13px",
};

const STATUS_PILL: Record<TechRequestStatus, { bg: string; fg: string }> = {
  open: { bg: "#f7e4e2", fg: "var(--accent)" },
  in_progress: { bg: "#fbf1d6", fg: "#9a6a00" },
  done: { bg: "#e7f5ee", fg: "#197a48" },
};

/** Parses a JSON string list (demoProducts/auditFocus); falls back to splitting on lines/commas. */
function parseStringList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.map(String).filter((s) => s.trim());
  } catch {
    // not JSON — split by delimiters
  }
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatCreated(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "America/New_York",
  });
}

/** Deadline relative to today: "today/tomorrow/yesterday" or "Month DD". */
function formatDeadline(deadline: string | null): string {
  if (!deadline) return "not set";
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return deadline;
  const now = new Date();
  const dayMs = 86_400_000;
  const diff = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
      dayMs,
  );
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long" });
}

/** Stable display number for a request derived from its id (id is a UUID; the design shows "#312"). */
function reqDisplayNo(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return "#" + (100 + (h % 900));
}

const CalendarIcon = (
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
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 4 }}>{label}</div>
      <div style={{ font: "600 13px Arial", color: "#16181d" }}>{value}</div>
    </div>
  );
}

/**
 * "Add to calendar" — request scheduling (date+time). Client-side flow as in the
 * reference: button → date/time form → confirmation. No backend yet (UI scheduling only).
 */
function CalendarAdd() {
  const [mode, setMode] = useState<"idle" | "form" | "done">("idle");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [touched, setTouched] = useState(false);
  const filled = Boolean(date && time);

  if (mode === "done") {
    const label = `${date.split("-").reverse().join(".")} at ${time}`;
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          background: "rgba(231,245,238,0.55)",
          border: "1px solid #bfe3d2",
          borderRadius: 13,
          padding: "12px 15px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            background: "#197a48",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0, font: "600 13px Arial", color: "#197a48" }}>
          Added to calendar — {label}
        </div>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div
        style={{
          background: "rgba(252,249,245,0.6)",
          border: "1px solid rgba(120,130,150,0.16)",
          borderRadius: 14,
          padding: 15,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ font: "600 13px Arial", color: "#16181d", marginBottom: 12 }}>
          When to add to the calendar
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 13 }}>
          <label style={{ flex: 1, minWidth: 150 }}>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>Date</div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={INPUT}
            />
          </label>
          <label style={{ flex: 1, minWidth: 150 }}>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>Time</div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={INPUT}
            />
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => (filled ? setMode("done") : setTouched(true))}
            style={{
              border: "none",
              background: filled ? "#1c1f27" : "#9aa0ad",
              color: "#fff",
              font: "600 13px Arial",
              padding: "10px 17px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setMode("idle")}
            style={{
              border: "1px solid rgba(120,130,150,0.3)",
              background: "rgba(255,255,255,0.7)",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "10px 16px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          {touched && !filled ? (
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>Specify date and time</span>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setMode("form")}
      style={{
        border: "none",
        background: "#1c1f27",
        color: "#fff",
        font: "600 13px Arial",
        padding: "11px 18px",
        borderRadius: 999,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {CalendarIcon}
      Add to calendar
    </button>
  );
}

function InfoPanel({
  req,
  clientName,
  managerName,
  canFillAct,
  onFillAct,
}: {
  req: TechRequest;
  clientName: string;
  managerName: string | null;
  canFillAct: boolean;
  onFillAct: () => void;
}) {
  const demoLoc = req.demoLocation
    ? (DEMO_LOCATION_LABELS[req.demoLocation] ?? req.demoLocation)
    : null;
  const consultFmt = req.consultFormat
    ? (CONSULT_FORMAT_LABELS[req.consultFormat] ?? req.consultFormat)
    : null;
  const products = parseStringList(req.demoProducts);
  const focus = parseStringList(req.auditFocus);
  const pill = STATUS_PILL[req.status];

  return (
    <div>
      {/* Header: "TECH REQUEST #id" + client + type */}
      <div style={{ marginBottom: 18, paddingRight: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
          <span style={{ font: "700 11px Arial", color: "var(--accent)", letterSpacing: ".6px" }}>
            TECH REQUEST
          </span>
          <span style={{ font: "600 12px Arial", color: "#9a9ea8" }}>{reqDisplayNo(req.id)}</span>
        </div>
        <div style={{ font: "700 20px Arial", letterSpacing: "-.3px", color: "#16181d" }}>
          {clientName}
        </div>
        <div style={{ font: "500 13px Arial", color: "#6b6f78", marginTop: 3 }}>
          {TECH_REQUEST_KIND_LABELS[req.kind]}
        </div>
      </div>

      {/* Three cards: date created / deadline / status */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <div style={INFO_CARD}>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 4 }}>
            Date created
          </div>
          <div style={{ font: "600 13px Arial", color: "#16181d" }}>
            {formatCreated(req.createdAt)}
          </div>
        </div>
        <div style={INFO_CARD}>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 4 }}>Deadline</div>
          <div style={{ font: "600 13px Arial", color: "#16181d" }}>
            {formatDeadline(req.deadline)}
          </div>
        </div>
        <div style={INFO_CARD}>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 6 }}>Status</div>
          <span
            style={{
              background: pill.bg,
              color: pill.fg,
              font: "600 11px Arial",
              padding: "4px 10px",
              borderRadius: 999,
            }}
          >
            {TECH_REQUEST_STATUS_LABELS[req.status]}
          </span>
        </div>
      </div>

      {/* Details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 28 }}>
          {managerName ? <Field label="Manager" value={managerName} /> : null}
          {demoLoc ? <Field label="Where" value={demoLoc} /> : null}
          {req.demoAddress ? <Field label="Address" value={req.demoAddress} /> : null}
          {consultFmt ? <Field label="Format" value={consultFmt} /> : null}
        </div>

        {products.length > 0 ? (
          <div>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 7 }}>
              Products to test
            </div>
            <div
              style={{
                border: "1px solid #efe9e2",
                borderRadius: 11,
                overflow: "hidden",
                background: "rgba(255,255,255,0.5)",
              }}
            >
              {products.map((name, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    padding: "10px 13px",
                    borderBottom: i < products.length - 1 ? "1px solid #f1ece5" : "none",
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      width: 24,
                      height: 24,
                      borderRadius: 7,
                      background: "#eef0f2",
                      color: "#6b6f78",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      font: "700 11px Arial",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      font: "600 13px/1.35 Arial",
                      color: "#16181d",
                    }}
                  >
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {focus.length > 0 ? (
          <div>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 7 }}>
              Audit focus
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {focus.map((f) => (
                <span
                  key={f}
                  style={{
                    background: "#f7e4e2",
                    color: "var(--accent)",
                    font: "600 12px Arial",
                    padding: "6px 12px",
                    borderRadius: 999,
                  }}
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {req.note ? (
          <div>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 4 }}>Note</div>
            <div style={{ font: "400 13px/1.5 Arial", color: "#16181d" }}>{req.note}</div>
          </div>
        ) : null}
      </div>

      {/* Footer: add to calendar + (if in progress) fill out act */}
      <div
        style={{
          marginTop: 22,
          paddingTop: 18,
          borderTop: "1px solid #ece6df",
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <CalendarAdd />
        {canFillAct ? (
          <button
            type="button"
            onClick={onFillAct}
            style={{
              border: "1px solid #d9d2c8",
              background: "#fff",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "11px 18px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            Fill out act
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ── result chips ─────────────────────────────────────────────────────

/** Result tone → a [background, color] pair from the warm theme (ok/warn/bad). */
const RESULT_TONE: Record<"ok" | "warn" | "bad", readonly [string, string]> = {
  ok: ["#e7f5ee", "#197a48"],
  warn: ["#fbf1d6", "#9a6a00"],
  bad: ["#f7e4e2", "var(--accent)"],
};

/**
 * Result chip sets depend on the act's kind (reference: RESULT_SETS). The value
 * (`value`) is the domain value (success/partial/failure); the label depends on the
 * kind; the tone sets the color.
 */
const RESULT_SETS: Record<
  TestActKind,
  ReadonlyArray<{ value: string; label: string; tone: "ok" | "warn" | "bad" }>
> = {
  workup: [
    { value: "success", label: "Successful", tone: "ok" },
    { value: "partial", label: "Partial", tone: "warn" },
    { value: "failure", label: "Unsuccessful", tone: "bad" },
  ],
  consult_summary: [
    { value: "success", label: "Advice given", tone: "ok" },
    { value: "partial", label: "Test needed", tone: "warn" },
    { value: "failure", label: "Didn't fit", tone: "bad" },
  ],
  audit_summary: [
    { value: "success", label: "No issues", tone: "ok" },
    { value: "partial", label: "Issues found", tone: "warn" },
    { value: "failure", label: "Critical", tone: "bad" },
  ],
};

/** Act kind by tech request kind (demo/onsite/test → workup; consult; audit_req). */
function actKindForReq(kind: TechRequest["kind"]): TestActKind {
  if (kind === "consult") return "consult_summary";
  if (kind === "audit_req") return "audit_summary";
  return "workup";
}

/** Result label in a saved document card (by act kind + domain result). */
function resultChipView(actKind: TestActKind, result: string) {
  const set = RESULT_SETS[actKind];
  const found = set.find((r) => r.value === result);
  const tone = found?.tone ?? "warn";
  const [bg, color] = RESULT_TONE[tone];
  return { label: found?.label ?? "Result", bg, color };
}

// ── act form panel ───────────────────────────────────────────────────

const VOICE_BTN: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  background:
    "radial-gradient(120% 150% at 100% 0%, var(--ai-glow) 0%, transparent 62%), linear-gradient(150deg,#2a2f3b 0%,#14171f 100%)",
  color: "#fff",
  font: "600 11px Arial",
  padding: "6px 12px",
  borderRadius: 999,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  whiteSpace: "nowrap",
};

/** Inline Lucide-style design-system icons (viewBox 24, stroke 2, currentColor). */
function Icon({ size = 14, d }: { size?: number; d: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d.split("|").map((path, i) => (
        <path key={i} d={path} />
      ))}
    </svg>
  );
}

const MicIcon = (
  <Icon
    size={12}
    d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z|M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"
  />
);
const PencilIcon = <Icon d="M12 20h9|M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />;
const FileIcon = (
  <Icon size={15} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z|M14 2v6h6" />
);
const SaveIcon = (
  <Icon d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z|M17 21v-8H7v8M7 3v5h8" />
);
const SendIcon = <Icon size={15} d="m22 2-7 20-4-9-9-4 20-7z" />;
const PlusIcon = <Icon size={15} d="M12 5v14M5 12h14" />;
const CheckIcon = (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
const FlaskIcon = <Icon size={13} d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />;

/** Act form type. */
type ActForm = {
  equipment: string;
  productName: string;
  dosage: string;
  processParams: string;
  recommendation: string;
  auditChecked: string;
  auditRemarks: string;
  auditRecommendation: string;
  comment: string;
};

const EMPTY_LABEL = "—";

/** Snapshot of a saved document for the "DOCUMENTS" section (multi-act, from already-entered fields). */
type SavedDoc = {
  actId: string;
  actKind: TestActKind;
  num: number;
  date: string;
  result: string;
  fields: ActForm;
};

/** A field's display value ("—" when empty). */
const orDash = (v: string) => (v.trim() ? v : EMPTY_LABEL);

/** A single saved document card in the "DOCUMENTS" section (read-only). */
function SavedDocCard({ doc }: { doc: SavedDoc }) {
  const res = resultChipView(doc.actKind, doc.result);
  const f = doc.fields;
  return (
    <div
      style={{
        border: "1px solid #efe9e2",
        borderRadius: 12,
        background: "rgba(255,255,255,0.55)",
        padding: "13px 14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            flex: "none",
            borderRadius: 8,
            background: "#eef0f2",
            color: "#6b6f78",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {FileIcon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "600 13px Arial", color: "#16181d" }}>
            {TEST_ACT_KIND_LABELS[doc.actKind]} #{doc.num}
          </div>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 1 }}>{doc.date}</div>
        </div>
        <span
          style={{
            flex: "none",
            background: res.bg,
            color: res.color,
            font: "600 11px Arial",
            padding: "4px 10px",
            borderRadius: 999,
          }}
        >
          {res.label}
        </span>
      </div>

      {doc.actKind === "workup" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <DocField label="Equipment" value={orDash(f.equipment)} />
          <div style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
            <DocField label="Product" value={orDash(f.productName)} />
            <DocField label="Dosage" value={orDash(f.dosage)} />
          </div>
          <DocField label="Parameters" value={orDash(f.processParams)} />
        </div>
      ) : null}

      {doc.actKind === "consult_summary" ? (
        <DocField label="Recommendation" value={orDash(f.recommendation)} />
      ) : null}

      {doc.actKind === "audit_summary" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <DocField label="What was checked" value={orDash(f.auditChecked)} />
          <DocField label="Issues" value={orDash(f.auditRemarks)} />
          <DocField label="Recommendations" value={orDash(f.auditRecommendation)} />
        </div>
      ) : null}

      {f.comment.trim() ? (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #f1ece5" }}>
          <DocField label="Comment" value={f.comment} />
        </div>
      ) : null}
    </div>
  );
}

/** A "label / value" pair inside a document card. */
function DocField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ font: "400 10.5px Arial", color: "#9a9ea8", marginBottom: 2 }}>{label}</div>
      <div style={{ font: "500 12.5px Arial", color: "#16181d", lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

/** Form field label (warm theme: 400 11px #9a9ea8). */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>{children}</div>
  );
}

function ActFormPanel({
  req,
  savedActId,
  onSaved,
}: {
  req: TechRequest;
  savedActId: string | null;
  onSaved: (actId: string) => void;
}) {
  const [saveState, saveAction, savePending] = useActionState(saveTestActAction, null);
  const [sendState, sendAction, sendPending] = useActionState(sendTestActAction, null);
  const [result, setResult] = useState<string>("success");

  // Determine actKind from request kind
  const actKind: TestActKind = actKindForReq(req.kind);

  // Controlled act fields — so "Dictate" (AI) can auto-fill them.
  const [form, setForm] = useState<ActForm>({
    equipment: "",
    productName: req.demoProducts ?? "",
    dosage: "",
    processParams: "",
    recommendation: "",
    auditChecked: "",
    auditRemarks: "",
    auditRecommendation: "",
    comment: "",
  });
  const set =
    (key: keyof ActForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Saved documents (multi-act): snapshots of already-entered fields. The "DOCUMENTS"
  // section and "Send to manager" work off this local list — no new server fields
  // (the save action only returns actId).
  const [docs, setDocs] = useState<SavedDoc[]>([]);
  // Whether to show the "New document" form: always for the first act, then via "Add new act".
  const [formShown, setFormShown] = useState(true);

  // Voice → AI: the transcription (Whisper) fills in the act's fields by its kind.
  const [parsing, setParsing] = useState(false);
  const applyDraft = (draft: TestActDraft, transcript: string) => {
    const spoken = draft.comment && draft.comment.trim() ? draft.comment : transcript;
    setForm((f) => {
      if (actKind === "workup") {
        return {
          ...f,
          equipment: draft.equipment ?? f.equipment,
          productName: draft.productName ?? f.productName,
          dosage: draft.dosage ?? f.dosage,
          processParams: draft.processParams ?? f.processParams,
          comment: draft.comment ?? f.comment,
        };
      }
      if (actKind === "consult_summary") return { ...f, recommendation: spoken };
      return { ...f, auditChecked: spoken };
    });
    if (draft.result === "success" || draft.result === "failure") setResult(draft.result);
  };
  const parseAndFill = async (text: string) => {
    if (!text.trim()) return;
    setParsing(true);
    try {
      applyDraft(await draftTechActFromVoiceAction(text), text);
    } finally {
      setParsing(false);
    }
  };
  const {
    recording,
    busy,
    error: voiceError,
    start,
    stop,
  } = useServerRecorder((text) => {
    void parseAndFill(text);
  });
  const voiceBusy = busy || parsing;

  // A successfully server-saved act → a snapshot in the documents list, form is hidden.
  // The field/result snapshot is taken at the moment the save action commits (a ref
  // "mirror"), so the effect doesn't depend on form/result and doesn't rebuild the
  // document when they're edited afterward.
  const savedActRef = saveState?.ok ? saveState.actId : null;
  const snapshotRef = useRef<{ fields: ActForm; result: string }>({ fields: form, result });
  snapshotRef.current = { fields: form, result };
  useEffect(() => {
    if (!savedActRef) return;
    setDocs((prev) => {
      if (prev.some((d) => d.actId === savedActRef)) return prev;
      return [
        ...prev,
        {
          actId: savedActRef,
          actKind,
          num: prev.length + 1,
          date: new Date().toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "America/New_York",
          }),
          result: snapshotRef.current.result,
          fields: snapshotRef.current.fields,
        },
      ];
    });
    setFormShown(false);
    onSaved(savedActRef);
  }, [savedActRef, actKind, onSaved]);

  // actId for "Send to manager": the last one saved locally, or from props.
  const lastActId = docs.at(-1)?.actId ?? savedActId;
  const sent = sendState?.ok;

  const resultChips = RESULT_SETS[actKind];

  return (
    <div>
      {/* "Sent to manager" banner */}
      {sent ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            background: "rgba(231,245,238,0.55)",
            border: "1px solid #bfe3d2",
            borderRadius: 13,
            padding: "13px 15px",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              flex: "none",
              borderRadius: "50%",
              background: "#197a48",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {CheckIcon}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ font: "600 13px Arial", color: "#197a48" }}>Sent to manager</div>
            <div style={{ font: "400 11.5px Arial", color: "#6b6f78", marginTop: 2 }}>
              Results have been shared on the deal — the manager sees them in the card.
            </div>
          </div>
        </div>
      ) : null}

      {/* "DOCUMENTS · N" section — saved acts as cards */}
      {docs.length > 0 ? (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              font: "600 11px Arial",
              color: "#9a9ea8",
              letterSpacing: ".5px",
              marginBottom: 9,
            }}
          >
            DOCUMENTS · {docs.length}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {docs.map((doc) => (
              <SavedDocCard key={doc.actId} doc={doc} />
            ))}
          </div>
        </div>
      ) : null}

      {/* Not sent yet — form/add-new and the send footer */}
      {!sent ? (
        <>
          {/* Dashed "Add new act" — if documents exist and the form is hidden */}
          {docs.length > 0 && !formShown ? (
            <button
              type="button"
              onClick={() => setFormShown(true)}
              style={{
                border: "1.5px dashed #d4cabd",
                background: "rgba(255,255,255,0.4)",
                color: "#16181d",
                font: "600 13px Arial",
                padding: "13px 18px",
                borderRadius: 12,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                boxSizing: "border-box",
              }}
            >
              {PlusIcon}
              Add new act
            </button>
          ) : null}

          {/* "New document" card with the form */}
          {formShown ? (
            <div
              style={{
                background: "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.7)",
                borderRadius: 14,
                padding: 16,
              }}
            >
              {/* Card header: pencil + "New document" + "Dictate" */}
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <span
                  style={{
                    width: 26,
                    height: 26,
                    flex: "none",
                    borderRadius: 8,
                    background: "#1c1f27",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {PencilIcon}
                </span>
                <span style={{ font: "600 14px Arial", color: "#16181d" }}>New document</span>
                {!recording && !voiceBusy ? (
                  <button
                    type="button"
                    style={{ ...VOICE_BTN, marginLeft: "auto" }}
                    onClick={() => void start()}
                    title="AI will transcribe speech and fill it in"
                  >
                    {MicIcon}
                    Dictate
                  </button>
                ) : null}
              </div>

              {/* Dark voice-recording card */}
              {recording || voiceBusy ? (
                <div
                  style={{
                    marginBottom: 14,
                    background:
                      "radial-gradient(135% 122% at 100% -4%, var(--ai-glow) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 12,
                    padding: "11px 13px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                  }}
                >
                  <span
                    style={{
                      width: 32,
                      height: 32,
                      flex: "none",
                      borderRadius: 9,
                      background: "rgba(255,255,255,0.10)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      size={15}
                      d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z|M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: "700 12.5px Arial" }}>Recording</div>
                    <div
                      style={{
                        font: "400 11px Arial",
                        color: "rgba(255,255,255,.66)",
                        marginTop: 1,
                      }}
                    >
                      {parsing
                        ? "AI is filling in the fields…"
                        : busy
                          ? "Transcribing…"
                          : 'Say the summary out loud, then tap "Stop".'}
                    </div>
                  </div>
                  {recording ? (
                    <button
                      type="button"
                      onClick={() => void stop()}
                      style={{
                        flex: "none",
                        border: "none",
                        background: "var(--accent)",
                        color: "#fff",
                        font: "600 12px Arial",
                        padding: "7px 14px",
                        borderRadius: 999,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: "#fff" }} />
                      Stop
                    </button>
                  ) : (
                    <span
                      style={{
                        flex: "none",
                        font: "600 12px Arial",
                        color: "rgba(255,255,255,.72)",
                      }}
                    >
                      Transcribing…
                    </span>
                  )}
                </div>
              ) : null}

              {voiceError ? (
                <p style={{ font: "500 12px Arial", color: "var(--accent)", margin: "0 0 12px" }}>
                  {voiceError}
                </p>
              ) : null}

              <form action={saveAction}>
                <input type="hidden" name="dealId" value={req.dealId} />
                <input type="hidden" name="techRequestId" value={req.id} />
                <input type="hidden" name="actKind" value={actKind} />

                {/* Workup act */}
                {actKind === "workup" ? (
                  <>
                    <FieldLabel>Equipment</FieldLabel>
                    <input
                      type="text"
                      name="equipment"
                      value={form.equipment}
                      onChange={set("equipment")}
                      placeholder="E.g. Miwe oven, Diosna mixer"
                      style={{ ...INPUT, marginBottom: 12 }}
                    />
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 12,
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <FieldLabel>Product</FieldLabel>
                        <input
                          type="text"
                          name="productName"
                          value={form.productName}
                          onChange={set("productName")}
                          placeholder="Product name"
                          style={INPUT}
                        />
                      </div>
                      <div>
                        <FieldLabel>Dosage</FieldLabel>
                        <input
                          type="text"
                          name="dosage"
                          value={form.dosage}
                          onChange={set("dosage")}
                          placeholder="E.g. 12% of mass"
                          style={INPUT}
                        />
                      </div>
                    </div>
                    <FieldLabel>Process parameters</FieldLabel>
                    <input
                      type="text"
                      name="processParams"
                      value={form.processParams}
                      onChange={set("processParams")}
                      placeholder="Mixing, temperature, time…"
                      style={{ ...INPUT, marginBottom: 12 }}
                    />
                  </>
                ) : null}

                {/* Consultation summary */}
                {actKind === "consult_summary" ? (
                  <>
                    <FieldLabel>Recommendation / advice given</FieldLabel>
                    <textarea
                      name="recommendation"
                      value={form.recommendation}
                      onChange={set("recommendation")}
                      rows={3}
                      placeholder="Call summary: what was discussed, what was recommended to the client"
                      style={{ ...TEXTAREA, lineHeight: 1.5, marginBottom: 12 }}
                    />
                  </>
                ) : null}

                {/* Audit summary */}
                {actKind === "audit_summary" ? (
                  <>
                    <FieldLabel>What was checked</FieldLabel>
                    <input
                      type="text"
                      name="auditChecked"
                      value={form.auditChecked}
                      onChange={set("auditChecked")}
                      placeholder="Areas, equipment, processes"
                      style={{ ...INPUT, marginBottom: 12 }}
                    />
                    <FieldLabel>Issues found</FieldLabel>
                    <textarea
                      name="auditRemarks"
                      value={form.auditRemarks}
                      onChange={set("auditRemarks")}
                      rows={2}
                      placeholder="What's wrong at the plant"
                      style={{ ...TEXTAREA, lineHeight: 1.5, marginBottom: 12 }}
                    />
                    <FieldLabel>Recommendations</FieldLabel>
                    <textarea
                      name="auditRecommendation"
                      value={form.auditRecommendation}
                      onChange={set("auditRecommendation")}
                      rows={2}
                      placeholder="What to offer the client"
                      style={{ ...TEXTAREA, lineHeight: 1.5, marginBottom: 12 }}
                    />
                  </>
                ) : null}

                {/* Result — chips by request kind, active one colored by tone */}
                <FieldLabel>Result</FieldLabel>
                <div
                  style={{
                    display: "inline-flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  {resultChips.map((r) => {
                    const on = result === r.value;
                    const [bg, color] = RESULT_TONE[r.tone];
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setResult(r.value)}
                        style={{
                          border: `1.5px solid ${on ? color : "rgba(120,130,150,0.28)"}`,
                          background: on ? bg : "transparent",
                          color: on ? color : "#9a9ea8",
                          font: "600 12px Arial",
                          padding: "7px 14px",
                          borderRadius: 999,
                          cursor: "pointer",
                        }}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" name="result" value={result} />

                {/* Comment */}
                <FieldLabel>Comment</FieldLabel>
                <textarea
                  name="comment"
                  value={form.comment}
                  onChange={set("comment")}
                  rows={2}
                  placeholder="What matters from the results"
                  style={{ ...TEXTAREA, lineHeight: 1.45 }}
                />

                {saveState && !saveState.ok ? (
                  <p style={{ font: "500 12px Arial", color: "var(--accent)", margin: "10px 0 0" }}>
                    {saveState.error}
                  </p>
                ) : null}

                {/* "Save document" — accent capsule with a floppy disk, below a divider */}
                <div style={{ marginTop: 15, paddingTop: 14, borderTop: "1px solid #ece6df" }}>
                  <button
                    type="submit"
                    disabled={savePending}
                    style={{
                      border: "none",
                      background: "var(--accent)",
                      color: "#fff",
                      font: "600 12.5px Arial",
                      padding: "10px 18px",
                      borderRadius: 999,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 7,
                      opacity: savePending ? 0.6 : 1,
                    }}
                  >
                    {SaveIcon}
                    {savePending ? "Saving…" : "Save document"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          {/* Footer: hint + "Send to manager" (always with a paper plane) */}
          <div
            style={{
              marginTop: 16,
              paddingTop: 16,
              borderTop: "1px solid #ece6df",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 13,
              flexWrap: "wrap",
            }}
          >
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>
              Save 1+ document and send it to the manager.
            </span>
            <form action={sendAction}>
              <input type="hidden" name="actId" value={lastActId ?? ""} />
              <button
                type="submit"
                disabled={sendPending || !lastActId}
                style={{
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  font: "600 13px Arial",
                  padding: "11px 20px",
                  borderRadius: 999,
                  cursor: lastActId ? "pointer" : "not-allowed",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  opacity: sendPending || !lastActId ? 0.55 : 1,
                }}
              >
                {SendIcon}
                {sendPending ? "Sending…" : "Send to manager"}
              </button>
            </form>
          </div>

          {sendState && !sendState.ok ? (
            <p style={{ font: "500 12px Arial", color: "var(--accent)", margin: "12px 0 0" }}>
              {sendState.error}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────

type PopupMode = "info" | "act";

export function TechQueueItem({
  req,
  dealTitle,
  clientName,
  managerName,
  assignedToName,
  savedActs,
}: {
  req: TechRequest;
  dealTitle: string;
  clientName: string;
  /** The manager who filed the request (requestedBy) — shown in the "Manager" card. */
  managerName: string | null;
  assignedToName: string | null;
  savedActs?: readonly TestAct[];
}) {
  const [takeState, takeAction, takePending] = useActionState(takeTechRequestAction, null);
  const [doneState, _doneAction, _donePending] = useActionState(completeTechRequestAction, null);
  const [popupMode, setPopupMode] = useState<PopupMode | null>(null);
  const [savedActId, setSavedActId] = useState<string | null>(null);
  // Row hover highlight (reference :823 style-hover) — inline styles can't do :hover, we track state.
  const [hover, setHover] = useState(false);
  const handleSaved = useCallback((id: string) => setSavedActId(id), []);

  const error = (!takeState?.ok && takeState?.error) || (!doneState?.ok && doneState?.error);

  // Most recently saved act from props (for re-render after server revalidate)
  const lastSavedAct = savedActs && savedActs.length > 0 ? savedActs[savedActs.length - 1] : null;
  const latestSavedActId = savedActId ?? (lastSavedAct ? lastSavedAct.id : null);

  return (
    <>
      {/* Row wrapper: bottom divider; clickable row inside with rounding + hover (reference :822-823) */}
      <div style={{ borderBottom: "1px solid #f3f4f6" }}>
        <div
          style={{ ...ROW, background: hover ? "rgba(120,130,150,0.05)" : "transparent" }}
          onClick={() => setPopupMode("info")}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          role="button"
          tabIndex={0}
          title={dealTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") setPopupMode("info");
          }}
        >
          {/* Chevron — a decorative navigation indicator (reference :824, no click) */}
          <span
            style={{ flex: "0 0 16px", color: "#9aa0ad", display: "flex", alignItems: "center" }}
            aria-hidden
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
          {/* Request number (a stable demo derivation from id, reference "#312") */}
          <span style={{ flex: "0 0 52px", font: "600 13px Arial", color: "#16181d" }}>
            {reqDisplayNo(req.id)}
          </span>
          {/* Client — name only (reference :826) */}
          <span style={{ ...CELL, flex: 2, minWidth: 0, font: "600 13px Arial", color: "#16181d" }}>
            {clientName}
          </span>
          <span style={{ ...CELL, flex: 2, minWidth: 0 }}>
            {TECH_REQUEST_KIND_LABELS[req.kind]}
            {assignedToName ? (
              <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}> · {assignedToName}</span>
            ) : null}
            {error ? (
              <span style={{ display: "block", font: "600 12px Arial", color: "var(--accent)" }}>
                {error}
              </span>
            ) : null}
          </span>
          <span style={{ ...CELL, font: "500 13px Arial", color: "#6b6f78" }}>
            {formatCreated(req.createdAt)}
          </span>
          <span style={{ ...CELL, font: "500 13px Arial", color: "#6b6f78" }}>
            {formatDeadline(req.deadline)}
          </span>
          <span style={{ flex: "0 0 96px" }}>
            <span style={statusBadgeStyle(ROW_STATUS_TONE[req.status])}>
              {TECH_REQUEST_STATUS_LABELS[req.status]}
            </span>
          </span>
          <span
            style={{
              flex: "0 0 132px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {req.status === "open" ? (
              <form action={takeAction}>
                <input type="hidden" name="requestId" value={req.id} />
                <button
                  type="submit"
                  style={{ ...ROW_ACTION_BTN, opacity: takePending ? 0.6 : 1 }}
                  disabled={takePending}
                >
                  {takePending ? "…" : "Take in progress"}
                </button>
              </form>
            ) : null}
            {req.status === "in_progress" ? (
              <button
                type="button"
                style={ROW_ACTION_BTN}
                onClick={(e) => {
                  e.stopPropagation();
                  setPopupMode("act");
                }}
              >
                {FlaskIcon}
                Fill out act
              </button>
            ) : null}
          </span>
        </div>
      </div>

      {popupMode !== null ? (
        <Popup onClose={() => setPopupMode(null)}>
          {popupMode === "info" ? (
            <InfoPanel
              req={req}
              clientName={clientName}
              managerName={managerName}
              canFillAct={req.status === "in_progress"}
              onFillAct={() => setPopupMode("act")}
            />
          ) : (
            <div>
              {/* Act screen header: "Back to request" → title → "{client} · {id}" */}
              <div style={{ marginBottom: 18, paddingRight: 40 }}>
                <button
                  type="button"
                  onClick={() => setPopupMode("info")}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    font: "600 12px Arial",
                    color: "#6b6f78",
                    cursor: "pointer",
                    background: "none",
                    border: "none",
                    padding: 0,
                    marginBottom: 9,
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
                    <path d="M19 12H5M11 18l-6-6 6-6" />
                  </svg>
                  Back to request
                </button>
                <div style={{ font: "700 20px Arial", letterSpacing: "-.3px", color: "#16181d" }}>
                  {TEST_ACT_KIND_LABELS[actKindForReq(req.kind)]}
                </div>
                <div style={{ font: "500 13px Arial", color: "#6b6f78", marginTop: 3 }}>
                  {clientName} · {reqDisplayNo(req.id)}
                </div>
              </div>
              <ActFormPanel req={req} savedActId={latestSavedActId} onSaved={handleSaved} />
            </div>
          )}
        </Popup>
      ) : null}
    </>
  );
}
