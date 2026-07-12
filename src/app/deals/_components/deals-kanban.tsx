"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type CSSProperties,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { ModalOverlay } from "@/app/_components/modal-overlay";
import { type DealHealth, DEAL_HEALTH_LABELS } from "@/domain/deal/deal-attention";
import { DEAL_GOAL_LABELS, type DealGoal } from "@/domain/deal/deal-goal";
import {
  canRevert,
  canTransition,
  DEAL_STAGE_LABELS,
  DEAL_STAGES,
  type DealOutcome,
  type DealStage,
} from "@/domain/deal/deal-stage";
import { advanceStageAction, revertStageAction } from "../actions";
import { SAVED_VIEWS, type SavedViewId, applySavedView, isSavedViewId } from "./saved-views";

const VIEW_STORAGE_KEY = "crm-pro:deals-view";

export interface KanbanDeal {
  readonly id: string;
  readonly title: string;
  readonly stage: DealStage;
  readonly clientId: string;
  readonly clientName: string;
  readonly managerName: string;
  readonly goal: DealGoal;
  /** Outcome of a completed deal (won/lost); undefined — not completed/not set. */
  readonly outcome?: DealOutcome;
  /** A deal in an active stage with no planned next step ("stalled"). */
  readonly needsNextStep: boolean;
  /** Days on the current stage (from events); null — no transitions yet. */
  readonly daysOnStage: number | null;
  /** Stuck on a stage too long — a discipline signal. */
  readonly stale: boolean;
  /** Deal health as a single signal (Score Pill). */
  readonly health: DealHealth;
  /** The deal is assigned to the current user (for the "My active" view). */
  readonly isMine: boolean;
}

/** Deal-health dot colors (8x8) matching the prototype's warm theme. */
const HEALTH_DOT_COLOR: Record<Exclude<DealHealth, "neutral">, string> = {
  healthy: "#1f9e6c",
  attention: "#c9991c",
  critical: "var(--accent)",
};

/** Deal-health indicator dot on the card (8x8). Not drawn for neutral. */
function HealthDot({ health }: { health: DealHealth }) {
  if (health === "neutral") {
    return null;
  }
  return (
    <span
      title={DEAL_HEALTH_LABELS[health]}
      aria-label={DEAL_HEALTH_LABELS[health]}
      className={`health-dot health-dot--${health}`}
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: HEALTH_DOT_COLOR[health],
        boxShadow: health === "critical" ? "0 0 0 3px rgba(191,50,43,.16)" : "none",
        flex: "none",
      }}
    />
  );
}

/** Flame icon for "urgent" (critical) deals — on the right of the title row. */
function FireIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="var(--accent)"
      stroke="none"
      style={{ marginLeft: "auto", flex: "none" }}
      aria-hidden="true"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

/** Formats a day count as "N day"/"N days". */
function pluralDays(n: number): string {
  return `${n} ${n === 1 ? "day" : "days"}`;
}

/** Manager avatar background palette (dark-gray gradation from the prototype). */
const MANAGER_AVATAR_PALETTE = ["#1c1f27", "#363c49", "#565e6e", "#9aa0ad"] as const;

/** Manager initials: first letters of the first two words of the name (fallback — 2 letters). */
function managerInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "—";
  }
  if (words.length === 1) {
    const word = words[0] ?? "";
    return word.slice(0, 2).toUpperCase();
  }
  const first = words[0]?.charAt(0) ?? "";
  const second = words[1]?.charAt(0) ?? "";
  return (first + second).toUpperCase();
}

/** Deterministic avatar background derived from the manager's name. */
function managerAvatarBg(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const index = hash % MANAGER_AVATAR_PALETTE.length;
  return MANAGER_AVATAR_PALETTE[index] ?? "#1c1f27";
}

export interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Kanban funnel with drag-and-drop cards between stages (HTML5 DnD, no
 * dependencies). Stage changes only happen by dragging: `move` via
 * advanceStageAction with a canTransition check; the UI updates optimistically
 * and rolls back on error.
 */
export function DealsKanban({
  deals: initial,
  initialView,
}: {
  deals: readonly KanbanDeal[];
  initialView?: SavedViewId;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [deals, setDeals] = useState<readonly KanbanDeal[]>(initial);
  const [dragId, setDragId] = useState<string | null>(null);

  // The server is the source of truth: on revalidatePath('/deals') (deal creation,
  // a confirmed stage transition) the RSC sends a new `initial`. Without this sync,
  // local state would get stuck on the mount-time snapshot → new deals wouldn't
  // appear until a manual reload. `initial`'s reference only changes on a server
  // re-render, not on client setState, so optimistic drag updates aren't discarded
  // needlessly.
  useEffect(() => {
    setDeals(initial);
  }, [initial]);

  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(() => new Set());
  const [view, setView] = useState<SavedViewId>(initialView ?? "all");
  const [revertTarget, setRevertTarget] = useState<{ id: string; toStage: DealStage } | null>(null);
  const [revertReason, setRevertReason] = useState("");

  // Horizontal board pan with the mouse: grab EMPTY space (background/column/heading)
  // and drag sideways. Cards (draggable), buttons, and links are excluded — they have
  // their own native drag-and-drop / click, which must not be broken.
  const boardRef = useRef<HTMLDivElement | null>(null);
  const panRef = useRef<{ startX: number; startScroll: number } | null>(null);
  const [panning, setPanning] = useState(false);

  // Restoring the selected view across sessions: if the URL has no view — take it
  // from localStorage (once on mount). The URL takes priority (sharing/deep-linking).
  useEffect(() => {
    if (initialView) {
      return;
    }
    // localStorage may be unavailable (test/SSR/private mode) — no saved view then.
    try {
      const stored = window.localStorage?.getItem(VIEW_STORAGE_KEY);
      if (isSavedViewId(stored)) {
        setView(stored);
      }
    } catch {
      // ignore
    }
  }, [initialView]);

  // While panning — listen to the mouse on window (so it doesn't "drop" when the
  // cursor leaves the board) and move scrollLeft by the delta.
  useEffect(() => {
    if (!panning) {
      return;
    }
    function onMove(event: MouseEvent) {
      const el = boardRef.current;
      const pan = panRef.current;
      if (!el || !pan) {
        return;
      }
      el.scrollLeft = pan.startScroll - (event.clientX - pan.startX);
    }
    function stop() {
      panRef.current = null;
      setPanning(false);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [panning]);

  function selectView(next: SavedViewId) {
    setView(next);
    try {
      window.localStorage?.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — the view isn't persisted across sessions
    }
    const url = new URL(window.location.href);
    if (next === "all") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", next);
    }
    window.history.replaceState(null, "", url);
  }

  // Opens a card in the side drawer (REQ-6): adds `?deal=<id>` to the URL without
  // leaving the list. router.push preserves the board's client state; DealDrawer
  // reads the param and slides in from the right. Deep-linking/refresh work from
  // the same URL.
  function openDrawer(id: string) {
    const params = new URLSearchParams(searchParams);
    params.set("deal", id);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  // Only start panning on "empty" space: cards (draggable), buttons, links, and
  // controls are excluded — otherwise we'd break card dragging and clicks/opening.
  function onBoardMouseDown(event: ReactMouseEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return; // left mouse button only
    }
    const target = event.target as HTMLElement;
    if (target.closest('[draggable="true"], button, a, input, select, textarea, label')) {
      return;
    }
    const el = boardRef.current;
    if (!el) {
      return;
    }
    event.preventDefault(); // don't start text selection while panning
    panRef.current = { startX: event.clientX, startScroll: el.scrollLeft };
    setPanning(true);
  }

  const dragged = dragId ? (deals.find((deal) => deal.id === dragId) ?? null) : null;
  const visibleDeals = applySavedView(deals, view);

  async function move(id: string, target: DealStage) {
    const deal = deals.find((item) => item.id === id);
    // Guard: don't start a second transition for the same card while the first is in flight.
    if (!deal || deal.stage === target || pending.has(id)) {
      return;
    }
    if (!canTransition(deal.stage, target)) {
      setError(
        `Invalid transition: ${DEAL_STAGE_LABELS[deal.stage]} → ${DEAL_STAGE_LABELS[target]}.`,
      );
      return;
    }
    const previous = deal.stage;
    setError(null);
    setPending((ids) => new Set(ids).add(id));
    setDeals((list) => list.map((item) => (item.id === id ? { ...item, stage: target } : item)));
    try {
      const result = await advanceStageAction({ dealId: id, to: target });
      if (!result.ok) {
        // Roll back only if the card is still in our optimistic stage —
        // so we don't overwrite a concurrent/subsequent transition.
        setDeals((list) =>
          list.map((item) =>
            item.id === id && item.stage === target ? { ...item, stage: previous } : item,
          ),
        );
        setError(result.error);
      }
    } finally {
      setPending((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  async function revert(id: string, toStage: DealStage, reason?: string) {
    const deal = deals.find((item) => item.id === id);
    if (!deal || pending.has(id)) {
      return;
    }
    const previous = deal.stage;
    setError(null);
    setPending((ids) => new Set(ids).add(id));
    setDeals((list) => list.map((item) => (item.id === id ? { ...item, stage: toStage } : item)));
    try {
      const result = await revertStageAction({ dealId: id, toStage, reason });
      if (!result.ok) {
        setDeals((list) =>
          list.map((item) =>
            item.id === id && item.stage === toStage ? { ...item, stage: previous } : item,
          ),
        );
        setError(result.error);
      }
    } finally {
      setPending((ids) => {
        const next = new Set(ids);
        next.delete(id);
        return next;
      });
    }
  }

  function promptAndRevert(id: string, toStage: DealStage) {
    setRevertReason("");
    setRevertTarget({ id, toStage });
  }

  function confirmRevert() {
    if (!revertTarget) {
      return;
    }
    const { id, toStage } = revertTarget;
    setRevertTarget(null);
    void revert(id, toStage, revertReason.trim() || undefined);
  }

  function canDropTo(stage: DealStage): boolean {
    if (dragged === null || dragged.stage === stage) return false;
    return canTransition(dragged.stage, stage) || canRevert(dragged.stage, stage);
  }

  function onDrop(event: DragEvent<HTMLDivElement>, stage: DealStage) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragId;
    setOverStage(null);
    setDragId(null);
    if (!id) return;
    const deal = deals.find((item) => item.id === id);
    if (!deal) return;
    if (canRevert(deal.stage, stage)) {
      promptAndRevert(id, stage);
    } else {
      void move(id, stage);
    }
  }

  // "No task" chip text: with the day count on the stage, if the deal has "stalled".
  function noStepText(deal: KanbanDeal): string {
    if (deal.stale && deal.daysOnStage !== null) {
      return `no task, ${deal.daysOnStage}d.`;
    }
    return "no task";
  }

  // Card meta line: "{manager} · {N days on stage}".
  function cardMeta(deal: KanbanDeal): string {
    if (deal.daysOnStage !== null) {
      return `${deal.managerName} · ${pluralDays(deal.daysOnStage)} on stage`;
    }
    return deal.managerName;
  }

  return (
    <>
      {error ? <p className="error">{error}</p> : null}
      <div
        className="saved-views"
        role="tablist"
        aria-label="Funnel views"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        {SAVED_VIEWS.map((savedView) => {
          const count = applySavedView(deals, savedView.id).length;
          const active = savedView.id === view;
          const isUrgent = savedView.id === "critical";
          const chipStyle: CSSProperties = active
            ? {
                background: "rgba(255,255,255,.18)",
                color: "#fff",
                borderRadius: 10,
                padding: "1px 7px",
                font: "600 11px Arial",
              }
            : savedView.id === "mine"
              ? {
                  background: "#efe9e2",
                  color: "#6a5f54",
                  borderRadius: 10,
                  padding: "1px 7px",
                  font: "600 11px Arial",
                }
              : savedView.id === "critical"
                ? {
                    background: "#f7e4e2",
                    color: "var(--accent)",
                    borderRadius: 10,
                    padding: "1px 7px",
                    font: "600 11px Arial",
                  }
                : {
                    background: "#fbf1d6",
                    color: "#9a6a00",
                    borderRadius: 10,
                    padding: "1px 7px",
                    font: "600 11px Arial",
                  };
          const buttonStyle: CSSProperties = active
            ? {
                border: "none",
                background: "#1c1f27",
                color: "#fff",
                font: "600 13px Arial",
                padding: "8px 15px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
              }
            : {
                border: "1px solid rgba(255,255,255,0.6)",
                background: "rgba(255,255,255,0.5)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "#16181d",
                font: "600 13px Arial",
                padding: "8px 15px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                gap: 7,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(31,45,80,0.06)",
              };
          return (
            <button
              key={savedView.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={"saved-view" + (active ? " saved-view--active" : "")}
              style={buttonStyle}
              onClick={() => selectView(savedView.id)}
            >
              {isUrgent ? (
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="var(--accent)"
                  stroke="none"
                  aria-hidden="true"
                >
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              ) : null}
              {savedView.label}
              <span className="saved-view__count" style={chipStyle}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
      <div
        ref={boardRef}
        className="kanban"
        onMouseDown={onBoardMouseDown}
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          // Large bottom padding under the columns — from the design reference (kboard, p. 1239).
          paddingBottom: 150,
          alignItems: "flex-start",
          cursor: panning ? "grabbing" : "grab",
          userSelect: panning ? "none" : undefined,
        }}
      >
        {DEAL_STAGES.map((stage) => {
          const columnDeals = visibleDeals.filter((deal) => deal.stage === stage);
          const droppable = canDropTo(stage);
          const columnClass =
            "kanban__col" +
            (overStage === stage && droppable ? " kanban__col--over" : "") +
            (dragged && !droppable && dragged.stage !== stage ? " kanban__col--nodrop" : "");
          const isCompleted = stage === "completed";
          return (
            <div
              key={stage}
              className={columnClass}
              style={{
                flex: "0 0 262px",
                background: "rgba(235,227,219,0.5)",
                border: "1px solid rgba(255,255,255,0.5)",
                borderRadius: 18,
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                minHeight: 130,
                outline: overStage === stage && droppable ? "2px solid var(--accent)" : "none",
                transition: "background .15s ease, outline .15s ease",
              }}
              onDragOver={(event) => {
                if (droppable) {
                  event.preventDefault();
                  setOverStage(stage);
                }
              }}
              onDragLeave={() => setOverStage((current) => (current === stage ? null : current))}
              onDrop={(event) => onDrop(event, stage)}
            >
              <div
                className="kanban__head"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "2px 4px",
                }}
              >
                <span style={{ font: "600 13px Arial" }}>{DEAL_STAGE_LABELS[stage]}</span>
                <span
                  className="kanban__count"
                  style={{ font: "600 12px Arial", color: isCompleted ? "#1f9e6c" : "#9a9ea8" }}
                >
                  {columnDeals.length}
                </span>
              </div>
              {columnDeals.length === 0
                ? null
                : columnDeals.map((deal) => {
                    const isCritical = deal.health === "critical";
                    return (
                      <div
                        key={deal.id}
                        className={
                          "kanban__card" +
                          (dragId === deal.id ? " kanban__card--dragging" : "") +
                          (pending.has(deal.id) ? " kanban__card--pending" : "") +
                          (deal.needsNextStep ? " kanban__card--attention" : "")
                        }
                        draggable={!pending.has(deal.id)}
                        style={{
                          background: "rgba(255,255,255,0.72)",
                          backdropFilter: "blur(8px)",
                          WebkitBackdropFilter: "blur(8px)",
                          border: "1px solid rgba(255,255,255,0.75)",
                          borderLeft: isCritical
                            ? "3px solid var(--accent)"
                            : "1px solid rgba(255,255,255,0.75)",
                          borderRadius: 13,
                          boxShadow:
                            "0 4px 14px rgba(45,38,32,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
                          padding: 12,
                          cursor: "grab",
                          opacity: dragId === deal.id ? 0.45 : 1,
                        }}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", deal.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDragId(deal.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverStage(null);
                        }}
                      >
                        <button
                          type="button"
                          className="kanban__card-title"
                          onClick={() => openDrawer(deal.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            marginBottom: 7,
                            width: "100%",
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <HealthDot health={deal.health} />
                          <span style={{ font: "600 13px/1.25 Arial" }}>{deal.title}</span>
                          {isCritical ? <FireIcon size={16} /> : null}
                        </button>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 7,
                            marginBottom: 9,
                          }}
                        >
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              background: managerAvatarBg(deal.managerName),
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              font: "700 9px Arial",
                              flex: "none",
                            }}
                          >
                            {managerInitials(deal.managerName)}
                          </span>
                          {/* Meta line "manager · days on stage" — a non-interactive
                              span from the design reference (p. 1246), not a link to the client. */}
                          <span
                            style={{
                              font: "400 11px Arial",
                              color: "#6b6f78",
                            }}
                          >
                            {cardMeta(deal)}
                          </span>
                        </div>
                        {/* Badge row per the design reference (p. 1247): the goal
                            badge (ochre #efe9e2/#6a5f54, no color swap for completed) +
                            an optional "no next step" badge. There is no separate
                            outcome badge (Won/Lost) on the card. */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <span
                            className="badge goal-badge"
                            style={{
                              background: "#efe9e2",
                              color: "#6a5f54",
                              font: "600 11px Arial",
                              padding: "3px 9px",
                              borderRadius: 999,
                            }}
                          >
                            {DEAL_GOAL_LABELS[deal.goal]}
                          </span>
                          {deal.needsNextStep ? (
                            <span
                              className="badge attention-badge"
                              title="The deal has no planned next step — easy to lose track of"
                              style={{
                                background: "#f7e4e2",
                                color: "var(--accent)",
                                font: "600 11px Arial",
                                padding: "3px 9px",
                                borderRadius: 999,
                              }}
                            >
                              {noStepText(deal)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
            </div>
          );
        })}
      </div>
      {revertTarget ? (
        <ModalOverlay ariaLabel="Revert stage" onClose={() => setRevertTarget(null)} maxWidth={440}>
          <h3 style={{ margin: "0 0 0.9rem", fontSize: "1.05rem" }}>
            Revert to "{DEAL_STAGE_LABELS[revertTarget.toStage]}"
          </h3>
          <label style={{ display: "block", marginBottom: "1rem" }}>
            Reason (optional)
            <input
              autoFocus
              value={revertReason}
              onChange={(event) => setRevertReason(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  confirmRevert();
                }
                if (event.key === "Escape") {
                  setRevertTarget(null);
                }
              }}
              placeholder="E.g. dragged the card by mistake"
              style={{ width: "100%", marginTop: "0.35rem" }}
            />
          </label>
          <div className="stage-controls">
            <button type="button" className="btn btn--primary" onClick={confirmRevert}>
              ↩ Revert
            </button>
            <button type="button" className="btn" onClick={() => setRevertTarget(null)}>
              Cancel
            </button>
          </div>
        </ModalOverlay>
      ) : null}
    </>
  );
}
