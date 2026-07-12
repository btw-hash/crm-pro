"use client";

import { useMemo, useState } from "react";
import { TECH_REQUEST_KIND_LABELS, type TechRequestKind } from "@/domain/tech-request/tech-request";
import { useServerRecorder } from "@/app/deals/[id]/_components/use-server-recorder";

// Glass panel of the warm theme (calendar grid container and the sticky panel on the right).
const GLASS_PANEL: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "22px",
};

// Palette for the technologist event types (from the TC_TYPES design reference): bg/bar/text.
const TC_TYPES: Record<TechRequestKind, { label: string; bg: string; bar: string; text: string }> =
  {
    onsite: { label: "Site visit", bg: "#e8eaed", bar: "#2b303c", text: "#1c1f27" },
    audit_req: { label: "Production audit", bg: "#f7e4e2", bar: "#bf322b", text: "#a82a25" },
    demo: { label: "Demo & testing", bg: "#fbf1d6", bar: "#e3b32b", text: "#8a5e00" },
    consult: { label: "Consultation", bg: "#e7eef9", bar: "#2f5fb0", text: "#274f95" },
    test: { label: "Recipe test", bg: "#e7f5ee", bar: "#1f9e6c", text: "#197a48" },
  };
// Order of types in the week legend / form chips.
const TC_TYPE_ORDER: readonly TechRequestKind[] = [
  "onsite",
  "audit_req",
  "demo",
  "consult",
  "test",
] as const;

// Time-grid hour scale: 08:00-20:00, hour row height 52px.
const TC_H0 = 8;
const TC_H1 = 20;
const TC_ROW = 52;
const TC_GRID_H = (TC_H1 - TC_H0) * TC_ROW;
const TC_MON = [
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
] as const;
const TC_DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);
const fmtHM = (x: number): string => {
  const h = Math.floor(x + 1e-6);
  return `${pad2(h)}:${pad2(Math.round((x - h) * 60))}`;
};
const fmtRange = (start: number, dur: number): string => `${fmtHM(start)}–${fmtHM(start + dur)}`;

// Calendar event — a deterministic demo derivative of a tech request (mapped in the
// server page.tsx). The right panel/form/wrap-up — client state-mockup with no backend.
export type CalendarEvent = {
  id: string;
  title: string;
  kind: TechRequestKind;
  /** ISO date of the event day (YYYY-MM-DD). */
  iso: string;
  /** Start hour on the time grid (decimal, e.g. 9.5 = 09:30). */
  start: number;
  /** Duration in hours. */
  dur: number;
  /** Place (address/phone) — demo derivative. */
  place: string;
  /** Event note — demo derivative. */
  note: string;
};

export type CalendarDay = {
  dow: string;
  dd: number;
  mon: number;
  iso: string;
  today: boolean;
  weekend: boolean;
};

type CalendarViewProps = {
  /** Screen title — rendered in the same flex row as the action block. */
  title: string;
  /** Subtitle under the title. */
  breadcrumb: string;
  /** Days of the current week (Mon..Sun) — computed on the server. */
  days: readonly CalendarDay[];
  /** All events of the week. */
  events: readonly CalendarEvent[];
  /** Week period label. */
  weekLabel: string;
  /** ISO "today" — the initially selected day in the day view. */
  todayIso: string;
};

// Event wrap-up — client state-mockup (no backend): "completed" status, result text,
// and attached documents.
type WrapData = { done: boolean; result: string; docs: { name: string; kind: string }[] };
const TC_DOC_C: Record<string, string> = {
  pdf: "#bf322b",
  img: "#2f5fb0",
  xls: "#197a48",
  doc: "#2f5fb0",
};
const TC_DOC_POOL: { name: string; kind: string }[] = [
  { name: "Visit report.pdf", kind: "pdf" },
  { name: "Sample photo.jpg", kind: "img" },
  { name: "Test protocol.xlsx", kind: "xls" },
  { name: "Recipe.docx", kind: "doc" },
];

const TC_DUR_OPTS: { v: number; label: string }[] = [
  { v: 0.5, label: "30 minutes" },
  { v: 1, label: "1 hour" },
  { v: 1.5, label: "1.5 hours" },
  { v: 2, label: "2 hours" },
  { v: 3, label: "3 hours" },
  { v: 4, label: "4 hours" },
  { v: 5, label: "5 hours" },
];

const hours = Array.from({ length: TC_H1 - TC_H0 }, (_, i) => `${pad2(TC_H0 + i)}:00`);

// New event form — a client draft (mockup; the real event is created from the tech queue).
type NewEventForm = {
  kind: TechRequestKind;
  title: string;
  date: string;
  start: string;
  dur: number;
  place: string;
  note: string;
};

const parseHM = (s: string): number => {
  const [h = "0", m = "0"] = s.split(":");
  return Number(h) + Number(m) / 60;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(120,130,150,0.22)",
  background: "rgba(255,255,255,0.7)",
  borderRadius: 11,
  padding: "10px 12px",
  font: "400 13px Arial",
  color: "#16181d",
  outline: "none",
};
const fieldLabelStyle: React.CSSProperties = {
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
  marginBottom: 7,
};
const iconBtnStyle: React.CSSProperties = {
  flex: "none",
  border: "none",
  background: "rgba(28,31,39,0.06)",
  color: "#6b6f78",
  width: 30,
  height: 30,
  borderRadius: 9,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

/**
 * Client-side interactive part of the technologist calendar: Week/Day switcher, weekly
 * and daily time grids, right sticky panel (empty / new event / details + event wrap-up
 * with voice dictation). The server page.tsx computes the days and maps requests to
 * events, passing them as props. Everything editable here (new-event form, wrap-up,
 * documents) is a client demo mockup with no backend: the real scheduling/wrap-up lives
 * in the tech queue and the act.
 */
export function CalendarView({
  title,
  breadcrumb,
  days,
  events,
  weekLabel,
  todayIso,
}: CalendarViewProps): React.JSX.Element {
  const [view, setView] = useState<"week" | "day">("week");
  const todayIdx = Math.max(
    0,
    days.findIndex((d) => d.iso === todayIso),
  );
  const [dayIdx, setDayIdx] = useState<number>(todayIdx);
  // Locally created events (form mockup) are added to the server ones.
  const [addedEvents, setAddedEvents] = useState<CalendarEvent[]>([]);
  // Locally deleted events (mockup) — their ids.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Event wrap-up/documents: id → WrapData (client mockup).
  const [wraps, setWraps] = useState<Record<string, WrapData>>({});
  // Result text draft for the selected event.
  const [resultDraft, setResultDraft] = useState<{ id: string; text: string } | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [form, setForm] = useState<NewEventForm>({
    kind: "consult",
    title: "",
    date: todayIso,
    start: "10:00",
    dur: 1,
    place: "",
    note: "",
  });

  // All events = server ones (minus locally deleted) + locally added.
  const allEvents = useMemo(
    () => events.filter((e) => !removedIds.includes(e.id)).concat(addedEvents),
    [events, removedIds, addedEvents],
  );

  const total = allEvents.length;
  const summary = TC_TYPE_ORDER.map((k) => ({
    kind: k,
    label: TC_TYPES[k].label,
    bar: TC_TYPES[k].bar,
    count: allEvents.filter((e) => e.kind === k).length,
  })).filter((s) => s.count > 0);

  const eventsByDay = (iso: string): CalendarEvent[] =>
    allEvents.filter((e) => e.iso === iso).sort((a, b) => a.start - b.start);

  const selEv = selId ? (allEvents.find((e) => e.id === selId) ?? null) : null;
  const wrapData: WrapData = selId
    ? (wraps[selId] ?? { done: false, result: "", docs: [] })
    : { done: false, result: "", docs: [] };

  const openAdd = (dateIso?: string): void => {
    setAddOpen(true);
    setSelId(null);
    if (dateIso) setForm((f) => ({ ...f, date: dateIso }));
  };
  const selectEvent = (id: string): void => {
    setSelId(id);
    setAddOpen(false);
    setResultDraft(null);
    setSavedId(null);
  };

  const wrapUpdate = (id: string, fn: (cur: WrapData) => WrapData): void => {
    setWraps((prev) => {
      const cur = prev[id] ?? { done: false, result: "", docs: [] };
      return { ...prev, [id]: fn(cur) };
    });
  };

  const submitNew = (): void => {
    const title = form.title.trim();
    if (!title || !form.date || !form.start) return;
    const id = `local-${Date.now()}`;
    const day = days.find((d) => d.iso === form.date);
    setAddedEvents((prev) =>
      prev.concat([
        {
          id,
          title,
          kind: form.kind,
          iso: form.date,
          start: parseHM(form.start),
          dur: form.dur,
          place: form.place.trim(),
          note: form.note.trim(),
        },
      ]),
    );
    setAddOpen(false);
    if (day) setDayIdx(days.indexOf(day));
    setForm({
      kind: "consult",
      title: "",
      date: form.date,
      start: "10:00",
      dur: 1,
      place: "",
      note: "",
    });
  };

  const deleteEvent = (): void => {
    if (!selId) return;
    const id = selId;
    setRemovedIds((prev) => prev.concat([id]));
    setAddedEvents((prev) => prev.filter((e) => e.id !== id));
    setSelId(null);
  };

  // ── Wrap-up: result draft, save, documents ──
  const draftActive = resultDraft != null && selId != null && resultDraft.id === selId;
  const resultValue = draftActive ? resultDraft.text : wrapData.result;
  const resultDirty = draftActive && resultDraft.text !== wrapData.result;
  const saved = savedId != null && savedId === selId && !resultDirty;

  const setResult = (text: string): void => {
    if (!selId) return;
    setResultDraft({ id: selId, text });
    setSavedId(null);
  };
  const saveResult = (): void => {
    if (!selId) return;
    const text = draftActive ? resultDraft.text : wrapData.result;
    wrapUpdate(selId, (cur) => ({ ...cur, result: text }));
    setResultDraft(null);
    setSavedId(selId);
  };
  const toggleDone = (): void => {
    if (!selId) return;
    wrapUpdate(selId, (cur) => ({ ...cur, done: !cur.done }));
  };
  const attachDoc = (): void => {
    if (!selId) return;
    wrapUpdate(selId, (cur) => ({
      ...cur,
      docs: cur.docs.concat([
        TC_DOC_POOL[cur.docs.length % TC_DOC_POOL.length] as (typeof TC_DOC_POOL)[number],
      ]),
    }));
  };
  const removeDoc = (idx: number): void => {
    if (!selId) return;
    wrapUpdate(selId, (cur) => ({ ...cur, docs: cur.docs.filter((_, j) => j !== idx) }));
  };

  // Voice dictation of the result — the same server-side STT (compliant data circuit) as
  // in the technologist's act: the recognized text is appended to the result draft.
  const { recording, busy, error, start, stop } = useServerRecorder((text) => {
    if (!selId) return;
    setResultDraft((prev) => {
      const base = prev && prev.id === selId ? prev.text : wrapData.result;
      const merged = base.trim() ? `${base.trim()} ${text}` : text;
      return { id: selId, text: merged };
    });
    setSavedId(null);
  });
  const voiceActive = recording || busy;

  // Wrap-up status: has the event passed (relative to "today").
  const selPast =
    selEv != null &&
    (selEv.iso < todayIso || (selEv.iso === todayIso && selEv.start + selEv.dur <= 11));
  const statusLabel = wrapData.done ? "Completed" : selPast ? "No wrap-up" : "Upcoming";
  const statusBg = wrapData.done ? "#e7f5ee" : selPast ? "#f7e4e2" : "#eef0f2";
  const statusC = wrapData.done ? "#197a48" : selPast ? "var(--accent)" : "#6b6f78";

  const addValid = !!(form.title.trim() && form.date && form.start);

  // Round period-navigator (prev/next) button with hover highlight.
  const pillBtn: React.CSSProperties = {
    border: "none",
    background: "transparent",
    color: "#16181d",
    width: 34,
    height: 34,
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background .12s",
  };
  const pillHoverOn = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.currentTarget.style.background = "rgba(28,31,39,0.06)";
  };
  const pillHoverOff = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.currentTarget.style.background = "transparent";
  };
  // Period navigator — a demo stand-in: there's no real week-paging in the backend, the
  // current period stays active. Prev/Next deterministically return to "this week" and
  // reset the day view to "today" (same as the center button).
  const goToday = (): void => setDayIdx(todayIdx);

  const dateLabel = (iso: string): string => {
    const d = new Date(`${iso}T00:00:00`);
    const dowIdx = (d.getDay() + 6) % 7;
    return `${TC_DOW[dowIdx]}, ${d.getDate()} ${TC_MON[d.getMonth()]}`;
  };

  return (
    <div>
      {/* Screen header: title+subtitle on the left, action block on the right — in one
          flex row, space-between (as in the design reference). */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px", color: "#16181d" }}>
            {title}
          </div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: 4 }}>{breadcrumb}</div>
        </div>

        {/* Header actions: period navigator + view switcher + "Schedule". */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Period navigator (demo stand-in: the current week/today stays active). */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.6)",
              borderRadius: 24,
              padding: 3,
              boxShadow: "0 4px 14px rgba(31,45,80,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <button
              type="button"
              onClick={goToday}
              onMouseEnter={pillHoverOn}
              onMouseLeave={pillHoverOff}
              title="Previous period"
              style={pillBtn}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goToday}
              style={{
                border: "none",
                background: "transparent",
                color: "#16181d",
                font: "600 13px Arial",
                padding: "0 12px",
                height: 34,
                borderRadius: 18,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {view === "week" ? "This week" : "Today"}
            </button>
            <button
              type="button"
              onClick={goToday}
              onMouseEnter={pillHoverOn}
              onMouseLeave={pillHoverOff}
              title="Next period"
              style={pillBtn}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Week/Day view switcher (functional). */}
          <div
            style={{
              display: "inline-flex",
              gap: 2,
              background: "rgba(28,31,39,0.05)",
              border: "1px solid rgba(120,130,150,0.14)",
              borderRadius: 999,
              padding: 3,
            }}
          >
            {(["week", "day"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  style={{
                    border: "none",
                    background: active ? "#1c1f27" : "transparent",
                    color: active ? "#fff" : "#5a5f6b",
                    boxShadow: active ? "0 2px 6px rgba(28,31,39,0.18)" : "none",
                    font: "600 12px Arial",
                    padding: "7px 14px",
                    borderRadius: 999,
                    cursor: "pointer",
                    transition: "background .12s, color .12s",
                  }}
                >
                  {v === "week" ? "Week" : "Day"}
                </button>
              );
            })}
          </div>

          {/* "Schedule" opens the new-event form in the right panel. */}
          <button
            type="button"
            onClick={() => openAdd()}
            style={{
              border: "none",
              background: "var(--accent)",
              color: "#fff",
              font: "600 13px Arial",
              padding: "11px 17px",
              borderRadius: 24,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              boxShadow: "0 6px 18px rgba(191,50,43,0.28)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Schedule
          </button>
        </div>
      </div>

      {/* Week summary: period · count + type legend. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 14,
        }}
      >
        <div style={{ font: "700 17px Arial", color: "#16181d" }}>
          {weekLabel}{" "}
          <span style={{ font: "400 13px Arial", color: "#9a9ea8" }}>· {total} events</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 15, flexWrap: "wrap" }}>
          {summary.map((s) => (
            <span
              key={s.kind}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                font: "500 12px Arial",
                color: "#6b6f78",
              }}
            >
              <span
                style={{ width: 10, height: 10, borderRadius: 3, background: s.bar, flex: "none" }}
              />
              {s.label} <b style={{ color: "#16181d", fontWeight: 700 }}>{s.count}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Two columns: time grid (week/day) on the left, sticky panel on the right. */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {view === "week" ? (
            <div style={{ ...GLASS_PANEL, padding: "10px 10px 6px" }}>
              {/* Day headers: short DOW + number in a circle (today is highlighted). */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "54px repeat(7,1fr)",
                  padding: "2px 0 8px",
                }}
              >
                <div />
                {days.map((col) => (
                  <div
                    key={col.iso}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <span
                      style={{ font: "600 11px Arial", color: "#9a9ea8", letterSpacing: ".3px" }}
                    >
                      {col.dow}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 28,
                        height: 28,
                        padding: "0 4px",
                        borderRadius: "50%",
                        background: col.today ? "#1c1f27" : "transparent",
                        color: col.today ? "#fff" : col.weekend ? "#aab0bc" : "#16181d",
                        font: "700 14px Arial",
                      }}
                    >
                      {col.dd}
                    </span>
                  </div>
                ))}
              </div>

              {/* Time grid: hour column + 7 day columns with event blocks. */}
              <div style={{ display: "grid", gridTemplateColumns: "54px repeat(7,1fr)" }}>
                <div style={{ position: "relative", height: TC_GRID_H }}>
                  {hours.map((h) => (
                    <div key={h} style={{ height: TC_ROW, position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          top: -7,
                          right: 8,
                          font: "500 11px Arial",
                          color: "#aab0bc",
                        }}
                      >
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
                {days.map((col) => (
                  <div
                    key={col.iso}
                    onClick={() => openAdd(col.iso)}
                    style={{
                      position: "relative",
                      height: TC_GRID_H,
                      borderLeft: "1px solid #eef0f2",
                      background: col.today ? "rgba(28,31,39,0.025)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    {hours.map((h) => (
                      <div key={h} style={{ height: TC_ROW, borderBottom: "1px solid #f2f0ec" }} />
                    ))}
                    {eventsByDay(col.iso).map((ev) => {
                      const t = TC_TYPES[ev.kind];
                      const top = Math.round((ev.start - TC_H0) * TC_ROW);
                      const height = Math.max(22, Math.round(ev.dur * TC_ROW) - 4);
                      const showMeta = ev.dur > 0.75;
                      const isSel = ev.id === selId;
                      const isDone = (wraps[ev.id]?.done ?? false) && !isSel;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            selectEvent(ev.id);
                          }}
                          style={{
                            position: "absolute",
                            left: 3,
                            right: 3,
                            top,
                            height,
                            background: t.bg,
                            borderLeft: `3px solid ${t.bar}`,
                            borderRadius: 7,
                            padding: "4px 7px",
                            cursor: "pointer",
                            overflow: "hidden",
                            boxSizing: "border-box",
                            boxShadow: isSel ? "0 0 0 2px #1c1f27" : "none",
                            opacity: isDone ? 0.6 : 1,
                          }}
                        >
                          <div
                            style={{
                              font: "700 11.5px Arial",
                              color: t.text,
                              lineHeight: 1.2,
                              overflowWrap: "break-word",
                              wordBreak: "break-word",
                            }}
                          >
                            {ev.title}
                          </div>
                          {showMeta ? (
                            <div
                              style={{
                                font: "500 10.5px Arial",
                                color: t.text,
                                opacity: 0.72,
                                marginTop: 1,
                                overflowWrap: "break-word",
                              }}
                            >
                              {fmtRange(ev.start, ev.dur)} · {TECH_REQUEST_KIND_LABELS[ev.kind]}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ ...GLASS_PANEL, padding: "14px 16px 8px" }}>
              {/* Day-of-week tabs — pick a column for the day view. */}
              <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
                {days.map((d, i) => {
                  const active = i === dayIdx;
                  return (
                    <button
                      key={d.iso}
                      type="button"
                      onClick={() => setDayIdx(i)}
                      style={{
                        border: "none",
                        background: active ? "#1c1f27" : "transparent",
                        color: active ? "#fff" : "#6b6f78",
                        font: "600 12px Arial",
                        padding: "7px 13px",
                        borderRadius: 10,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      {d.dow} <span style={{ fontWeight: 700 }}>{d.dd}</span>
                    </button>
                  );
                })}
              </div>

              {/* Single-column time grid for the selected day. */}
              <div style={{ display: "grid", gridTemplateColumns: "54px 1fr" }}>
                <div style={{ position: "relative", height: TC_GRID_H }}>
                  {hours.map((h) => (
                    <div key={h} style={{ height: TC_ROW, position: "relative" }}>
                      <span
                        style={{
                          position: "absolute",
                          top: -7,
                          right: 8,
                          font: "500 11px Arial",
                          color: "#aab0bc",
                        }}
                      >
                        {h}
                      </span>
                    </div>
                  ))}
                </div>
                <div
                  onClick={() => openAdd(days[dayIdx]?.iso)}
                  style={{
                    position: "relative",
                    height: TC_GRID_H,
                    borderLeft: "1px solid #eef0f2",
                    cursor: "pointer",
                  }}
                >
                  {hours.map((h) => (
                    <div key={h} style={{ height: TC_ROW, borderBottom: "1px solid #f2f0ec" }} />
                  ))}
                  {eventsByDay(days[dayIdx]?.iso ?? "").map((ev) => {
                    const t = TC_TYPES[ev.kind];
                    const top = Math.round((ev.start - TC_H0) * TC_ROW);
                    const height = Math.max(22, Math.round(ev.dur * TC_ROW) - 4);
                    const showMeta = ev.dur > 0.75;
                    const isSel = ev.id === selId;
                    const isDone = (wraps[ev.id]?.done ?? false) && !isSel;
                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectEvent(ev.id);
                        }}
                        style={{
                          position: "absolute",
                          left: 8,
                          right: 8,
                          top,
                          height,
                          background: t.bg,
                          borderLeft: `4px solid ${t.bar}`,
                          borderRadius: 9,
                          padding: "7px 13px",
                          cursor: "pointer",
                          overflow: "hidden",
                          boxSizing: "border-box",
                          boxShadow: isSel ? "0 0 0 2px #1c1f27" : "none",
                          opacity: isDone ? 0.6 : 1,
                        }}
                      >
                        <div style={{ font: "700 13px Arial", color: t.text, lineHeight: 1.25 }}>
                          {ev.title}
                        </div>
                        {showMeta ? (
                          <div
                            style={{
                              font: "500 11.5px Arial",
                              color: t.text,
                              opacity: 0.78,
                              marginTop: 2,
                            }}
                          >
                            {fmtRange(ev.start, ev.dur)} · {TECH_REQUEST_KIND_LABELS[ev.kind]}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky panel on the right: empty / new event / details + wrap-up. */}
        <div style={{ width: 380, flex: "none" }}>
          <div style={{ ...GLASS_PANEL, position: "sticky", top: 8, padding: 20 }}>
            {addOpen ? (
              <NewEventPanel
                form={form}
                setForm={setForm}
                addValid={addValid}
                onSubmit={submitNew}
                onClose={() => setAddOpen(false)}
              />
            ) : selEv ? (
              <EventDetailsPanel
                selEv={selEv}
                dateLabel={dateLabel(selEv.iso)}
                statusLabel={statusLabel}
                statusBg={statusBg}
                statusC={statusC}
                wrapData={wrapData}
                resultValue={resultValue}
                resultDirty={resultDirty}
                saved={saved}
                voiceActive={voiceActive}
                recording={recording}
                busy={busy}
                voiceError={error}
                onClose={() => setSelId(null)}
                onToggleDone={toggleDone}
                onSetResult={setResult}
                onSaveResult={saveResult}
                onVoiceStart={() => void start()}
                onVoiceStop={() => void stop()}
                onAttachDoc={attachDoc}
                onRemoveDoc={removeDoc}
                onDelete={deleteEvent}
              />
            ) : (
              <EmptyPanel onOpenAdd={() => openAdd()} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty mode: prompt to select an event / schedule one ──
function EmptyPanel({ onOpenAdd }: { onOpenAdd: () => void }): React.JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        padding: "26px 12px",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 16,
          background: "rgba(28,31,39,0.05)",
          color: "#9aa0ad",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
        </svg>
      </div>
      <div style={{ font: "600 15px Arial", color: "#16181d" }}>Event details & wrap-up</div>
      <div
        style={{
          font: "400 12.5px Arial",
          color: "#9a9ea8",
          lineHeight: 1.55,
          marginTop: 8,
          maxWidth: 250,
        }}
      >
        Select an event on the calendar to see its details, mark it completed, and wrap it up —
        describe the outcome and attach documents.
      </div>
      {/* The empty panel's only CTA — open the new-event form (as in the design reference). */}
      <button
        type="button"
        onClick={onOpenAdd}
        style={{
          marginTop: 18,
          border: "none",
          background: "var(--accent)",
          color: "#fff",
          font: "600 13px Arial",
          padding: "11px 18px",
          borderRadius: 12,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 6px 16px rgba(191,50,43,0.24)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        Schedule event
      </button>
    </div>
  );
}

// ── "New event" mode: form (client mockup) ──
function NewEventPanel({
  form,
  setForm,
  addValid,
  onSubmit,
  onClose,
}: {
  form: NewEventForm;
  setForm: React.Dispatch<React.SetStateAction<NewEventForm>>;
  addValid: boolean;
  onSubmit: () => void;
  onClose: () => void;
}): React.JSX.Element {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <span style={{ font: "700 16px Arial", letterSpacing: "-.2px" }}>New event</span>
        <button type="button" onClick={onClose} title="Close" style={iconBtnStyle}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div style={fieldLabelStyle}>TYPE</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 15 }}>
        {TC_TYPE_ORDER.map((k) => {
          const active = form.kind === k;
          const t = TC_TYPES[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => setForm((f) => ({ ...f, kind: k }))}
              style={{
                border: `1.5px solid ${active ? t.bar : "rgba(120,130,150,0.22)"}`,
                background: active ? t.bg : "rgba(255,255,255,0.5)",
                color: active ? t.text : "#6b6f78",
                fontWeight: active ? 700 : 500,
                fontSize: 12,
                fontFamily: "Arial",
                padding: "7px 11px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={fieldLabelStyle}>CLIENT OR TOPIC</div>
      <input
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        placeholder="E.g. Sunrise Bakery — audit"
        style={{ ...inputStyle, marginBottom: 14 }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={fieldLabelStyle}>DATE</div>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            style={inputStyle}
          />
        </div>
        <div>
          <div style={fieldLabelStyle}>START</div>
          <input
            type="time"
            value={form.start}
            onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <div>
          <div style={fieldLabelStyle}>DURATION</div>
          <select
            value={String(form.dur)}
            onChange={(e) => setForm((f) => ({ ...f, dur: Number(e.target.value) }))}
            style={{ ...inputStyle, cursor: "pointer" }}
          >
            {TC_DUR_OPTS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div style={fieldLabelStyle}>PLACE</div>
          <input
            value={form.place}
            onChange={(e) => setForm((f) => ({ ...f, place: e.target.value }))}
            placeholder="Address / phone"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={fieldLabelStyle}>NOTE</div>
      <textarea
        value={form.note}
        onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
        rows={2}
        placeholder="Meeting goal, what to prepare…"
        style={{ ...inputStyle, lineHeight: 1.5, resize: "vertical", marginBottom: 16 }}
      />

      <div style={{ display: "flex", gap: 9 }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!addValid}
          style={{
            flex: 1,
            border: "none",
            background: "var(--accent)",
            color: "#fff",
            font: "600 13px Arial",
            padding: "12px 16px",
            borderRadius: 12,
            cursor: addValid ? "pointer" : "default",
            opacity: addValid ? 1 : 0.45,
          }}
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid rgba(120,130,150,0.28)",
            background: "rgba(255,255,255,0.5)",
            color: "#6b6f78",
            font: "600 13px Arial",
            padding: "12px 16px",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── "Event details" mode + "Event wrap-up" block with voice dictation ──
function EventDetailsPanel({
  selEv,
  dateLabel,
  statusLabel,
  statusBg,
  statusC,
  wrapData,
  resultValue,
  resultDirty,
  saved,
  voiceActive,
  recording,
  busy,
  voiceError,
  onClose,
  onToggleDone,
  onSetResult,
  onSaveResult,
  onVoiceStart,
  onVoiceStop,
  onAttachDoc,
  onRemoveDoc,
  onDelete,
}: {
  selEv: CalendarEvent;
  dateLabel: string;
  statusLabel: string;
  statusBg: string;
  statusC: string;
  wrapData: WrapData;
  resultValue: string;
  resultDirty: boolean;
  saved: boolean;
  voiceActive: boolean;
  recording: boolean;
  busy: boolean;
  voiceError: string | null;
  onClose: () => void;
  onToggleDone: () => void;
  onSetResult: (text: string) => void;
  onSaveResult: () => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onAttachDoc: () => void;
  onRemoveDoc: (idx: number) => void;
  onDelete: () => void;
}): React.JSX.Element {
  const t = TC_TYPES[selEv.kind];
  const hasNote = selEv.note.trim().length > 0;
  return (
    <div>
      {/* Header: type badge + title + close. */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 13,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <span
            style={{
              display: "inline-block",
              background: t.bg,
              color: t.text,
              font: "700 10.5px Arial",
              padding: "3px 10px",
              borderRadius: 999,
              marginBottom: 8,
            }}
          >
            {t.label}
          </span>
          <div style={{ font: "700 18px Arial", letterSpacing: "-.3px", lineHeight: 1.25 }}>
            {selEv.title}
          </div>
        </div>
        <button type="button" onClick={onClose} title="Close" style={iconBtnStyle}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Meta: date / time / place. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#9a9ea8", flex: "none" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
          </span>
          <span style={{ font: "600 13px Arial", color: "#16181d" }}>{dateLabel}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#9a9ea8", flex: "none" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
          </span>
          <span style={{ font: "600 13px Arial", color: "#16181d" }}>
            {fmtRange(selEv.start, selEv.dur)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "#9a9ea8", flex: "none" }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </span>
          <span style={{ font: "500 13px Arial", color: "#16181d" }}>{selEv.place || "—"}</span>
        </div>
      </div>

      {hasNote ? (
        <div
          style={{
            background: "rgba(252,249,245,0.6)",
            border: "1px solid #efe9e2",
            borderRadius: 11,
            padding: "10px 13px",
          }}
        >
          <div style={{ ...fieldLabelStyle, fontSize: 10.5, marginBottom: 4 }}>NOTE</div>
          <div style={{ font: "400 12.5px Arial", color: "#16181d", lineHeight: 1.5 }}>
            {selEv.note}
          </div>
        </div>
      ) : null}

      {/* Event wrap-up: status + "completed" + result (dictation) + documents. */}
      <div style={{ borderTop: "1px solid #eef0f2", marginTop: 16, paddingTop: 15 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 13,
          }}
        >
          <span style={{ font: "700 14px Arial", color: "#16181d" }}>Event wrap-up</span>
          <span
            style={{
              background: statusBg,
              color: statusC,
              font: "700 10px Arial",
              letterSpacing: ".3px",
              padding: "3px 10px",
              borderRadius: 999,
              whiteSpace: "nowrap",
            }}
          >
            {statusLabel}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleDone}
          style={{
            width: "100%",
            border: `1px solid ${wrapData.done ? "#197a48" : "rgba(120,130,150,0.28)"}`,
            background: wrapData.done ? "#197a48" : "rgba(255,255,255,0.6)",
            color: wrapData.done ? "#fff" : "#16181d",
            font: "600 13px Arial",
            padding: 11,
            borderRadius: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 15,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          {wrapData.done ? "Completed" : "Mark as completed"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 7,
          }}
        >
          <span style={fieldLabelStyle}>RESULT</span>
          {!voiceActive ? (
            <button
              type="button"
              onClick={onVoiceStart}
              title="AI transcribes speech (Whisper, compliant data circuit) and fills in the result"
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "radial-gradient(120% 150% at 100% 0%, var(--ai-glow) 0%, transparent 62%), linear-gradient(150deg,#2a2f3b 0%,#14171f 100%)",
                color: "#fff",
                font: "600 11px Arial",
                padding: "6px 11px",
                borderRadius: 999,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
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
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
              Dictate
            </button>
          ) : null}
        </div>

        {voiceActive ? (
          <div
            style={{
              marginBottom: 11,
              background:
                "radial-gradient(135% 122% at 100% -4%, var(--ai-glow) 0%, transparent 56%), radial-gradient(135% 135% at -5% 106%, var(--ai-glow2) 0%, transparent 56%), linear-gradient(150deg,#2a2f3b 0%,#181b22 52%,#0c0e13 100%)",
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
                width: 34,
                height: 34,
                flex: "none",
                borderRadius: 10,
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.16)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
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
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ font: "700 12.5px Arial" }}>Recording result</div>
              <div style={{ font: "400 11px Arial", color: "rgba(255,255,255,.66)", marginTop: 2 }}>
                {recording
                  ? "Recording — speak closer to the microphone"
                  : "Transcribing on the server…"}
              </div>
            </div>
            {recording ? (
              <button
                type="button"
                onClick={onVoiceStop}
                style={{
                  flex: "none",
                  border: "none",
                  background: "var(--accent)",
                  color: "#fff",
                  font: "600 12px Arial",
                  padding: "8px 14px",
                  borderRadius: 999,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 2, background: "#fff" }} />
                Stop
              </button>
            ) : null}
            {busy ? (
              <span
                style={{ flex: "none", font: "600 12px Arial", color: "rgba(255,255,255,.72)" }}
              >
                Transcribing…
              </span>
            ) : null}
          </div>
        ) : null}

        {voiceError ? (
          <div
            style={{
              font: "400 11.5px Arial",
              color: "var(--accent)",
              marginBottom: 9,
              lineHeight: 1.5,
            }}
          >
            {voiceError}
          </div>
        ) : null}

        <textarea
          value={resultValue}
          onChange={(e) => onSetResult(e.target.value)}
          rows={4}
          placeholder="What was discussed, conclusions, agreements and the next step…"
          style={{ ...inputStyle, lineHeight: 1.55, resize: "vertical", marginBottom: 9 }}
        />

        <button
          type="button"
          onClick={onSaveResult}
          style={{
            width: "100%",
            border: "none",
            background: saved ? "#197a48" : resultDirty ? "var(--accent)" : "rgba(28,31,39,0.06)",
            color: saved || resultDirty ? "#fff" : "#9aa0ad",
            font: "600 13px Arial",
            padding: 10,
            borderRadius: 11,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 7,
            marginBottom: 15,
            transition: "background .15s, color .15s",
          }}
        >
          {saved ? (
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
          ) : null}
          {saved ? "Saved" : "Save result"}
        </button>

        <div style={fieldLabelStyle}>DOCUMENTS</div>
        {wrapData.docs.map((d, i) => (
          <div
            key={`${d.name}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 11px",
              background: "rgba(255,255,255,0.55)",
              border: "1px solid rgba(120,130,150,0.16)",
              borderRadius: 11,
              marginBottom: 7,
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                flex: "none",
                borderRadius: 8,
                background: "rgba(120,130,150,0.10)",
                color: TC_DOC_C[d.kind] ?? "#6b6f78",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                font: "500 12.5px Arial",
                color: "#16181d",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {d.name}
            </span>
            <button
              type="button"
              onClick={() => onRemoveDoc(i)}
              title="Remove"
              style={{
                flex: "none",
                border: "none",
                background: "transparent",
                color: "#aab0bc",
                cursor: "pointer",
                width: 22,
                height: 22,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                font: "400 16px Arial",
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={onAttachDoc}
          style={{
            width: "100%",
            border: "1.5px dashed #d9d2c8",
            background: "rgba(255,255,255,0.4)",
            borderRadius: 12,
            padding: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 9,
            color: "#6b6f78",
            font: "600 12.5px Arial",
            marginTop: 4,
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
            <path d="M21.4 11.05 12 20.45a5.5 5.5 0 0 1-7.78-7.78l8.5-8.49a3.67 3.67 0 1 1 5.18 5.19l-8.49 8.49a1.83 1.83 0 0 1-2.6-2.6l7.79-7.78" />
          </svg>
          Attach file
        </button>
      </div>

      <div style={{ marginTop: 14, paddingTop: 13, borderTop: "1px solid #f3f0eb" }}>
        <button
          type="button"
          onClick={onDelete}
          style={{
            border: "none",
            background: "transparent",
            color: "#aab0bc",
            font: "600 12px Arial",
            padding: "4px 0",
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
            <path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete event
        </button>
      </div>
    </div>
  );
}
