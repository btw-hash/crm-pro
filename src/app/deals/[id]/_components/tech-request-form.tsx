"use client";

import { useActionState, useState } from "react";
import { requestTechAction } from "../actions";
import { useServerRecorder } from "./use-server-recorder";
import type {
  TechRequestKind,
  ConsultFormat,
  DemoLocation,
} from "@/domain/tech-request/tech-request";

// ── styles ──────────────────────────────────────────────────────────

// Glassy panel container for the form fields (after the type cards).
const CARD: React.CSSProperties = {
  background: "rgba(255,255,255,0.5)",
  border: "1px solid rgba(255,255,255,0.7)",
  borderRadius: 14,
  padding: 16,
};

// Request-type selector card: 3×1fr grid, icon on top.
const TYPE_CARD_BASE: React.CSSProperties = {
  border: "1.5px solid rgba(120,130,150,0.18)",
  background: "rgba(255,255,255,0.45)",
  borderRadius: 14,
  padding: "14px 13px",
  cursor: "pointer",
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
  textAlign: "left" as const,
};

const TYPE_CARD_ACTIVE: React.CSSProperties = {
  ...TYPE_CARD_BASE,
  border: "1.5px solid var(--accent)",
  background: "rgba(191,50,43,0.06)",
};

const TYPE_ICON_BASE: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 10,
  background: "#eef0f2",
  color: "#6b6f78",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
};

const TYPE_ICON_ACTIVE: React.CSSProperties = {
  ...TYPE_ICON_BASE,
  background: "var(--accent)",
  color: "#fff",
};

// Format chips (neutral dark accent).
const CHIP_BASE: React.CSSProperties = {
  padding: "7px 13px",
  borderRadius: 999,
  border: "1.5px solid rgba(120,130,150,0.28)",
  background: "transparent",
  font: "600 12px Arial",
  cursor: "pointer",
  color: "#6b6f78",
};

const CHIP_ACTIVE: React.CSSProperties = {
  ...CHIP_BASE,
  background: "#1c1f27",
  color: "#fff",
  border: "1.5px solid #1c1f27",
};

// Audit focus chips — in the warm accent palette.
const FOCUS_CHIP_ACTIVE: React.CSSProperties = {
  ...CHIP_BASE,
  background: "#f7e4e2",
  color: "var(--accent)",
  border: "1.5px solid var(--accent)",
};

// Section overline heading ("REQUEST TYPE" in caps).
const OVERLINE: React.CSSProperties = {
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
  marginBottom: 9,
};

// Field label.
const LABEL_STYLE: React.CSSProperties = {
  font: "400 11px Arial",
  color: "#9a9ea8",
};

const OPTIONAL_HINT: React.CSSProperties = {
  color: "#bcbfc6",
  fontWeight: 400,
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
  outline: "none",
};

const TEXTAREA: React.CSSProperties = {
  ...INPUT,
  padding: "10px 12px",
  lineHeight: 1.5,
  resize: "vertical" as const,
};

const BTN_OUTLINE: React.CSSProperties = {
  background: "rgba(255,255,255,0.7)",
  color: "#16181d",
  border: "1px solid rgba(120,130,150,0.3)",
  borderRadius: 999,
  padding: "11px 18px",
  font: "600 13px Arial",
  cursor: "pointer",
};

// Dark AI "Dictate" button (Whisper, compliant data residency).
const AI_BTN: React.CSSProperties = {
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
  whiteSpace: "nowrap" as const,
};

// SVG icons for request types and actions (single currentColor stroke).
function IconChat() {
  return (
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
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

function IconFlask() {
  return (
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
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M7 16h10" />
    </svg>
  );
}

function IconClipboard() {
  return (
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
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="m9 14 2 2 4-4" />
    </svg>
  );
}

function IconMic() {
  return (
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
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
    </svg>
  );
}

function IconArrow() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function IconCheck() {
  return (
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
  );
}

function IconPlus() {
  return (
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
  );
}

function IconX() {
  return (
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function IconBox() {
  return (
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
      <path d="M16.5 9.4 7.5 4.21M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.27 6.96 8.73 5.05 8.73-5.05M12 22.08V12" />
    </svg>
  );
}

// Icons for the "Where to run it" segmented buttons: house (showroom) and pin (on-site).
function IconHome() {
  return (
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
      <path d="M3 21h18M6 21V7l6-4 6 4v14M10 9h.01M14 9h.01M10 13h.01M14 13h.01M10 17h.01M14 17h.01" />
    </svg>
  );
}

function IconPin() {
  return (
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
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

// ── type selector ───────────────────────────────────────────────────

const KINDS: {
  value: TechRequestKind;
  label: string;
  desc: string;
  icon: () => React.JSX.Element;
}[] = [
  {
    value: "consult",
    label: "Consultation",
    desc: "A question or task for the technologist about the client",
    icon: IconChat,
  },
  {
    value: "demo",
    label: "Demonstration and testing",
    desc: "Trial the products — in the showroom or on-site",
    icon: IconFlask,
  },
  {
    value: "audit_req",
    label: "Production audit",
    desc: "A technologist will inspect the client's production",
    icon: IconClipboard,
  },
];

// Deterministic demo stand-in: this client component has no product catalog
// (not passed as a prop, and we're not adding new repositories/actions),
// so product suggestions for the trial are a fixed demo list. In a real
// integration the catalog would come from the ERP here (see UPDATE-2026-07 §2,
// "catalog auto-suggestions").
const DEMO_PRODUCT_SUGGESTIONS: { name: string; cat: string }[] = [
  { name: "Belcolade Noir 55% Chocolate", cat: "Chocolate" },
  { name: "Carat Cover Dark Glaze", cat: "Glazes" },
  { name: "Cocoa Butter", cat: "Fats" },
  { name: "Pralin Hazelnut Paste", cat: "Fillings" },
  { name: "Cremodan SE 30 Stabilizer", cat: "Stabilizers" },
  { name: "Vanilla Flavoring", cat: "Flavorings" },
];

// ── consult format chips ────────────────────────────────────────────

const CONSULT_FORMATS: { value: ConsultFormat; label: string }[] = [
  { value: "call", label: "Phone call" },
  { value: "video", label: "Video call" },
  { value: "visit", label: "Client visit" },
];

// ── demo location toggle ────────────────────────────────────────────

const DEMO_LOCATIONS: {
  value: DemoLocation;
  label: string;
  icon: () => React.JSX.Element;
}[] = [
  { value: "showroom", label: "Millbrook Foods showroom", icon: IconHome },
  { value: "client", label: "On-site at client", icon: IconPin },
];

// ── audit focus chips ───────────────────────────────────────────────

const AUDIT_FOCUS_OPTIONS = [
  "Equipment",
  "Recipes and dosing",
  "Raw material storage",
  "Sanitation",
  "Quality control",
  "Packaging",
];

// ── summary view ────────────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Deterministic "July 14" format from an ISO date (type=date) for the summary. */
function formatDeadline(iso: string): string {
  const [, monthStr, dayStr] = iso.split("-");
  if (!monthStr || !dayStr) return iso;
  const day = parseInt(dayStr, 10);
  const month = MONTHS[parseInt(monthStr, 10) - 1];
  return month ? `${month} ${day}` : iso;
}

// Small label for a summary row.
const REVIEW_LABEL: React.CSSProperties = {
  font: "400 11px Arial",
  color: "#9a9ea8",
  marginBottom: 4,
};

const REVIEW_VALUE: React.CSSProperties = {
  font: "600 14px Arial",
  color: "#16181d",
};

// Summary pill chip (products — ochre, focus — accent).
const REVIEW_PILL_BASE: React.CSSProperties = {
  font: "600 12px Arial",
  padding: "6px 12px",
  borderRadius: 999,
};

function SummaryView({
  kind,
  note,
  deadline,
  consultFormat,
  demoLocation,
  demoAddress,
  demoProductList,
  auditFocus,
  onBack,
  onConfirm,
  pending,
}: {
  kind: TechRequestKind;
  note: string;
  deadline: string;
  consultFormat: ConsultFormat;
  demoLocation: DemoLocation;
  demoAddress: string;
  demoProductList: string[];
  auditFocus: string[];
  onBack: () => void;
  onConfirm: () => void;
  pending: boolean;
}) {
  const kindLabel = KINDS.find((k) => k.value === kind)?.label ?? kind;
  const fmtLabel = CONSULT_FORMATS.find((f) => f.value === consultFormat)?.label ?? consultFormat;
  const placeLabel = DEMO_LOCATIONS.find((l) => l.value === demoLocation)?.label ?? demoLocation;
  const noteLabel =
    kind === "consult"
      ? "Task for the technologist"
      : kind === "audit_req"
        ? "What to check / audit goal"
        : "Notes";

  return (
    <div>
      <div style={{ font: "600 16px Arial", color: "#16181d", marginBottom: 3 }}>
        Review the request to the technologist
      </div>
      <div style={{ font: "400 12.5px Arial", color: "#9a9ea8", marginBottom: 14 }}>
        Confirm — the request will go to the technologist, and the deal will move to the response
        stage.
      </div>

      <div style={CARD}>
        {/* header with the request type */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            marginBottom: 15,
            paddingBottom: 15,
            borderBottom: "1px solid #ece6df",
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: "none",
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
              <path d="m22 2-7 20-4-9-9-4 20-7z" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 3 }}>
              Request type
            </div>
            <div style={{ font: "700 15px Arial", color: "#16181d" }}>{kindLabel}</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {kind === "consult" ? (
            <div style={{ minWidth: 0 }}>
              <div style={REVIEW_LABEL}>Format</div>
              <div style={REVIEW_VALUE}>{fmtLabel}</div>
            </div>
          ) : null}

          {kind === "demo" ? (
            <div style={{ minWidth: 0 }}>
              <div style={REVIEW_LABEL}>Where to run it</div>
              <div style={REVIEW_VALUE}>{placeLabel}</div>
            </div>
          ) : null}

          {kind === "demo" && demoLocation === "client" && demoAddress ? (
            <div style={{ minWidth: 0 }}>
              <div style={REVIEW_LABEL}>Address / venue</div>
              <div style={{ ...REVIEW_VALUE, lineHeight: 1.35 }}>{demoAddress}</div>
            </div>
          ) : null}

          {kind === "demo" && demoProductList.length > 0 ? (
            <div style={{ minWidth: 0 }}>
              <div style={{ ...REVIEW_LABEL, marginBottom: 7 }}>Products for the trial</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {demoProductList.map((p) => (
                  <span
                    key={p}
                    style={{
                      ...REVIEW_PILL_BASE,
                      background: "rgba(227,179,43,0.14)",
                      color: "#8a5e00",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {kind === "audit_req" && auditFocus.length > 0 ? (
            <div style={{ minWidth: 0 }}>
              <div style={{ ...REVIEW_LABEL, marginBottom: 7 }}>Audit focus</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {auditFocus.map((f) => (
                  <span
                    key={f}
                    style={{
                      ...REVIEW_PILL_BASE,
                      background: "#f7e4e2",
                      color: "var(--accent)",
                    }}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {note ? (
            <div style={{ minWidth: 0 }}>
              <div style={REVIEW_LABEL}>{noteLabel}</div>
              <div style={{ font: "400 13px Arial", color: "#16181d", lineHeight: 1.5 }}>
                {note}
              </div>
            </div>
          ) : null}

          {deadline ? (
            <div style={{ minWidth: 0 }}>
              <div style={REVIEW_LABEL}>Deadline</div>
              <div style={REVIEW_VALUE}>{formatDeadline(deadline)}</div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: 9, marginTop: 16 }}>
        <button
          type="button"
          style={{
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            font: "600 13px Arial",
            padding: "11px 20px",
            borderRadius: 999,
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.6 : 1,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
          onClick={onConfirm}
          disabled={pending}
        >
          {pending ? (
            "Sending…"
          ) : (
            <>
              <IconCheck />
              Confirm and send
            </>
          )}
        </button>
        <button type="button" style={BTN_OUTLINE} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}

// ── main form ───────────────────────────────────────────────────────

export function TechRequestForm({
  dealId,
  clientId,
  dealTitle,
}: {
  dealId: string;
  clientId: string;
  dealTitle: string;
}) {
  const [state, action, pending] = useActionState(requestTechAction, null);

  const [kind, setKind] = useState<TechRequestKind>("consult");
  const [consultFormat, setConsultFormat] = useState<ConsultFormat>("call");
  const [demoLocation, setDemoLocation] = useState<DemoLocation>("showroom");
  const [demoAddress, setDemoAddress] = useState("");
  // Dynamic list of product inputs (at least one row).
  const [demoProducts, setDemoProducts] = useState<string[]>([""]);
  // Index of the input with the autocomplete open (null — all closed).
  const [openSugg, setOpenSugg] = useState<number | null>(null);
  const [auditFocus, setAuditFocus] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [deadline, setDeadline] = useState("");
  const [showSummary, setShowSummary] = useState(false);

  // Voice input via the server-side Whisper (compliant data residency): the transcript
  // is appended to the current note/task. The hook exposes recording/busy/error/start/stop.
  const recorder = useServerRecorder((text) => {
    setNote((prev) => (prev ? `${prev} ${text}` : text));
  });
  const voiceActive = recorder.recording || recorder.busy;

  // After success — show confirmation inline
  if (state?.ok) {
    return (
      <p className="muted" style={{ font: "500 13px Arial", color: "#197a48" }}>
        The request was sent to the technologist.
      </p>
    );
  }

  // Non-empty products — the source for both the gate and the server serialization.
  const filledProducts = demoProducts.map((p) => p.trim()).filter((p) => p.length > 0);
  const productCount = filledProducts.length;
  const productLabel =
    productCount === 0 ? "—" : `${productCount} ${productCount === 1 ? "product" : "products"}`;

  // Gate: required fields per type
  const canProceed =
    kind === "consult"
      ? note.trim() !== ""
      : kind === "demo"
        ? productCount > 0
        : /* audit_req */ note.trim() !== "";

  const gateHint =
    kind === "demo"
      ? productCount > 0
        ? ""
        : "Select at least one product"
      : note.trim() !== ""
        ? ""
        : "Fill in the task description";

  const noteLabel =
    kind === "consult"
      ? "Task for the technologist"
      : kind === "demo"
        ? "Notes"
        : "What to check / audit goal";
  const notePlaceholder =
    kind === "consult"
      ? "Describe the question or task for the technologist…"
      : kind === "demo"
        ? "What to show, what to pay attention to…"
        : "What to check at the plant, what to pay attention to…";
  const noteOptional = kind === "demo";

  function toggleAuditFocus(item: string) {
    setAuditFocus((prev) =>
      prev.includes(item) ? prev.filter((f) => f !== item) : [...prev, item],
    );
  }

  function setProductAt(i: number, value: string) {
    setDemoProducts((prev) => prev.map((p, idx) => (idx === i ? value : p)));
  }
  function addProduct() {
    setDemoProducts((prev) => [...prev, ""]);
  }
  function removeProduct(i: number) {
    setDemoProducts((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      return next.length > 0 ? next : [""];
    });
  }
  function pickSuggestion(i: number, value: string) {
    setProductAt(i, value);
    setOpenSugg(null);
  }

  function handleConfirm() {
    const fd = new FormData();
    fd.set("dealId", dealId);
    fd.set("clientId", clientId);
    fd.set("dealTitle", dealTitle);
    fd.set("kind", kind);
    fd.set("note", note);
    fd.set("deadline", deadline);
    fd.set("consultFormat", consultFormat);
    fd.set("demoLocation", demoLocation);
    fd.set("demoAddress", demoAddress);
    // The server expects demoProducts as a string (as before — mainField/fallback note);
    // we join the non-empty products with commas, the actions.ts contract stays unchanged.
    fd.set("demoProducts", filledProducts.join(", "));
    fd.set("auditFocus", JSON.stringify(auditFocus));
    action(fd);
  }

  if (showSummary) {
    return (
      <SummaryView
        kind={kind}
        note={note}
        deadline={deadline}
        consultFormat={consultFormat}
        demoLocation={demoLocation}
        demoAddress={demoAddress}
        demoProductList={filledProducts}
        auditFocus={auditFocus}
        onBack={() => setShowSummary(false)}
        onConfirm={handleConfirm}
        pending={pending}
      />
    );
  }

  return (
    <div>
      {/* error */}
      {state && !state.ok ? (
        <p
          className="error"
          style={{ color: "var(--accent)", font: "500 13px Arial", margin: "0 0 12px" }}
        >
          {state.error}
        </p>
      ) : null}

      {/* type selector — 3×1fr grid with icons */}
      <div style={OVERLINE}>REQUEST TYPE</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gap: 10,
          marginBottom: 18,
        }}
      >
        {KINDS.map((k) => {
          const active = kind === k.value;
          const Icon = k.icon;
          return (
            <button
              key={k.value}
              type="button"
              style={active ? TYPE_CARD_ACTIVE : TYPE_CARD_BASE}
              onClick={() => setKind(k.value)}
            >
              <span style={active ? TYPE_ICON_ACTIVE : TYPE_ICON_BASE}>
                <Icon />
              </span>
              <div>
                <div style={{ font: "700 13px Arial", color: "#16181d", lineHeight: 1.25 }}>
                  {k.label}
                </div>
                <div
                  style={{
                    font: "400 11px Arial",
                    color: "#9a9ea8",
                    marginTop: 3,
                    lineHeight: 1.35,
                  }}
                >
                  {k.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* single CARD panel with the form fields */}
      <div style={CARD}>
        {/* ── Demo: where to run it ── */}
        {kind === "demo" ? (
          <div style={{ marginBottom: 15 }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 7 }}>Where to run it</div>
            <div style={{ display: "flex", gap: 9 }}>
              {DEMO_LOCATIONS.map((loc) => {
                const active = demoLocation === loc.value;
                const LocIcon = loc.icon;
                return (
                  <button
                    key={loc.value}
                    type="button"
                    style={{
                      flex: 1,
                      border: active
                        ? "1.5px solid var(--accent)"
                        : "1.5px solid rgba(120,130,150,0.25)",
                      background: active ? "rgba(191,50,43,0.07)" : "rgba(255,255,255,0.5)",
                      color: active ? "#16181d" : "#6b6f78",
                      font: "600 13px Arial",
                      padding: 12,
                      borderRadius: 11,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                    onClick={() => setDemoLocation(loc.value)}
                  >
                    <LocIcon />
                    {loc.label}
                  </button>
                );
              })}
            </div>
            {demoLocation === "client" ? (
              <div style={{ marginTop: 11 }}>
                <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>Address / venue</div>
                <input
                  type="text"
                  style={INPUT}
                  placeholder="Client's production site address"
                  value={demoAddress}
                  onChange={(e) => setDemoAddress(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        {/* ── Demo: products for the trial (dynamic list) ── */}
        {kind === "demo" ? (
          <div style={{ marginBottom: 15 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 7,
              }}
            >
              <span style={LABEL_STYLE}>Products for the trial</span>
              <span style={{ font: "600 11px Arial", color: "#9a6a00" }}>{productLabel}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {demoProducts.map((name, i) => {
                const query = name.trim().toLowerCase();
                const matches = query
                  ? DEMO_PRODUCT_SUGGESTIONS.filter((p) => p.name.toLowerCase().includes(query))
                  : DEMO_PRODUCT_SUGGESTIONS;
                const showList = openSugg === i && matches.length > 0;
                const removable = demoProducts.length > 1;
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        style={INPUT}
                        placeholder="Product name"
                        value={name}
                        onChange={(e) => {
                          setProductAt(i, e.target.value);
                          setOpenSugg(i);
                        }}
                        onFocus={() => setOpenSugg(i)}
                        // Delay so a click on the suggestion (onMouseDown) has time to fire.
                        onBlur={() =>
                          setTimeout(() => setOpenSugg((cur) => (cur === i ? null : cur)), 150)
                        }
                      />
                      {showList ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "calc(100% + 4px)",
                            left: 0,
                            right: 0,
                            zIndex: 30,
                            background: "#fffdfb",
                            border: "1px solid rgba(120,130,150,0.2)",
                            borderRadius: 11,
                            boxShadow: "0 14px 34px rgba(31,45,80,0.16)",
                            overflow: "hidden",
                            maxHeight: 216,
                            overflowY: "auto",
                          }}
                        >
                          {matches.map((g) => (
                            <div
                              key={g.name}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                pickSuggestion(i, g.name);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                padding: "9px 12px",
                                cursor: "pointer",
                                borderBottom: "1px solid #f1ece5",
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
                                }}
                              >
                                <IconBox />
                              </span>
                              <span
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  font: "500 12.5px Arial",
                                  color: "#16181d",
                                }}
                              >
                                {g.name}
                              </span>
                              <span
                                style={{ flex: "none", font: "400 10.5px Arial", color: "#9a9ea8" }}
                              >
                                {g.cat}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {removable ? (
                      <button
                        type="button"
                        title="Remove"
                        onClick={() => removeProduct(i)}
                        style={{
                          flex: "none",
                          width: 34,
                          height: 34,
                          border: "1px solid #e8e1d9",
                          background: "rgba(255,255,255,0.7)",
                          borderRadius: 10,
                          cursor: "pointer",
                          color: "#9a9ea8",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <IconX />
                      </button>
                    ) : (
                      <span style={{ flex: "none", width: 34 }} />
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={addProduct}
              style={{
                marginTop: 9,
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
              <IconPlus />
              Add product
            </button>
          </div>
        ) : null}

        {/* ── Audit: focus chips ── */}
        {kind === "audit_req" ? (
          <div style={{ marginBottom: 15 }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 7 }}>
              Audit focus <span style={OPTIONAL_HINT}>· optional</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {AUDIT_FOCUS_OPTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  style={auditFocus.includes(item) ? FOCUS_CHIP_ACTIVE : CHIP_BASE}
                  onClick={() => toggleAuditFocus(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── Consultation: format chips ── */}
        {kind === "consult" ? (
          <div style={{ marginBottom: 15 }}>
            <div style={{ ...LABEL_STYLE, marginBottom: 7 }}>
              Format <span style={OPTIONAL_HINT}>· optional</span>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {CONSULT_FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  style={consultFormat === f.value ? CHIP_ACTIVE : CHIP_BASE}
                  onClick={() => setConsultFormat(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── note/task + voice input ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span style={LABEL_STYLE}>
            {noteLabel}
            {noteOptional ? <span style={OPTIONAL_HINT}> · optional</span> : null}
          </span>
          {!voiceActive ? (
            <button
              type="button"
              title="AI transcribes speech and fills it in"
              style={AI_BTN}
              onClick={() => void recorder.start()}
            >
              <IconMic />
              Dictate
            </button>
          ) : null}
        </div>

        {voiceActive ? (
          <div
            style={{
              marginBottom: 11,
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
            <div
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
              <IconMic />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 12.5px Arial" }}>Recording the request</div>
              <div
                style={{
                  font: "400 11px Arial",
                  color: "rgba(255,255,255,.66)",
                  marginTop: 1,
                }}
              >
                {recorder.recording
                  ? "Recording — press “Stop”."
                  : "Transcribing on the server (Whisper, compliant data residency)…"}
              </div>
            </div>
            {recorder.recording ? (
              <button
                type="button"
                onClick={() => void recorder.stop()}
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
                style={{ flex: "none", font: "600 12px Arial", color: "rgba(255,255,255,.72)" }}
              >
                Transcribing…
              </span>
            )}
          </div>
        ) : null}

        {recorder.error ? (
          <p style={{ color: "var(--accent)", font: "500 12px Arial", margin: "0 0 8px" }}>
            {recorder.error}
          </p>
        ) : null}

        <textarea
          style={TEXTAREA}
          rows={3}
          placeholder={notePlaceholder}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        {/* deadline */}
        <div style={{ marginTop: 13 }}>
          <div style={{ ...LABEL_STYLE, marginBottom: 5 }}>
            Deadline <span style={OPTIONAL_HINT}>· optional</span>
          </div>
          <input
            type="date"
            style={{ ...INPUT, width: "auto" }}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        {/* gate button */}
        <div
          style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: "1px solid #ece6df",
            display: "flex",
            alignItems: "center",
            gap: 13,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            style={{
              border: "none",
              background: canProceed ? "var(--accent)" : "#cfcabf",
              color: "#fff",
              font: "600 13px Arial",
              padding: "11px 20px",
              borderRadius: 999,
              cursor: canProceed ? "pointer" : "not-allowed",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              transition: "background .15s",
            }}
            disabled={!canProceed}
            onClick={() => setShowSummary(true)}
          >
            Review request
            <IconArrow />
          </button>
          {gateHint ? (
            <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>{gateHint}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
