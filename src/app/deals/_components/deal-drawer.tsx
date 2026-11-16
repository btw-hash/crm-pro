"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { DealHealth } from "@/domain/deal/deal-attention";
import {
  type DealDrawerData,
  type DrawerTimelineKind,
  type DrawerTrackStage,
  getDealDrawerData,
} from "./drawer-actions";

/**
 * Colored health badge for a deal (pill from the warm-theme reference): [label, bg, color].
 * Values 1:1 from the CRM-PRO prototype (HEALTHMAP). `neutral` (a terminal deal)
 * has no badge — we return null for it and skip drawing the pill.
 */
const HEALTH_BADGE: Record<DealHealth, { label: string; bg: string; color: string } | null> = {
  critical: { label: "Critical", bg: "#f7e4e2", color: "var(--accent)" },
  attention: { label: "Needs attention", bg: "#fbf1d6", color: "#9a6a00" },
  healthy: { label: "Healthy", bg: "#e7f5ee", color: "#197a48" },
  neutral: null,
};

/**
 * Days "on this stage" for the meta line. There's no real counter in the drawer
 * props (it's computed on the board), so this is a deterministic demo derivative:
 * a stable hash of the id shifted by deal health (critical lingers longer than healthy).
 * No new backend fields; the same id always yields the same number.
 */
function demoDaysOnStage(id: string, health: DealHealth): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 997;
  }
  const base: Record<DealHealth, [number, number]> = {
    critical: [14, 10], // >= the "lingering too long" threshold
    attention: [7, 6],
    healthy: [1, 5],
    neutral: [1, 5],
  };
  const [min, span] = base[health];
  return min + (hash % span);
}

/** English pluralization for "day/days" on stage. */
function daysWord(n: number): string {
  return n === 1 ? "day" : "days";
}

/**
 * Stage status in the vertical stepper, derived from the pre-computed track pill
 * colors (drawer-actions): the current stage is the accent one (color "#fff"), done
 * stages come before it, the rest are future. Returns inline styles for the
 * circle/line/label 1:1 from the reference (done ✓ in #197a48, current — var(--accent),
 * future — #efe9e2).
 */
function stepperStyle(
  stage: DrawerTrackStage,
  index: number,
  currentIndex: number,
): {
  mark: string;
  circleBg: string;
  circleC: string;
  labelC: string;
  labelW: string;
  lineBg: string;
} {
  const isCurrent = currentIndex >= 0 && index === currentIndex;
  const isDone = currentIndex >= 0 && index < currentIndex;
  if (isDone) {
    return {
      mark: "✓",
      circleBg: "#197a48",
      circleC: "#fff",
      labelC: "#9a9ea8",
      labelW: "500",
      lineBg: "#bfe3d2",
    };
  }
  if (isCurrent) {
    return {
      mark: String(index + 1),
      circleBg: "var(--accent)",
      circleC: "#fff",
      labelC: "#16181d",
      labelW: "700",
      lineBg: "#e8e1d9",
    };
  }
  return {
    mark: String(index + 1),
    circleBg: "#efe9e2",
    circleC: "#9a9ea8",
    labelC: "#9a9ea8",
    labelW: "500",
    lineBg: "#e8e1d9",
  };
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Colors of the activity timeline's colored icon by kind (warm-theme reference). */
const TIMELINE_ICON_COLORS: Record<DrawerTimelineKind, { bg: string; color: string }> = {
  call: { bg: "#e7f5ee", color: "#197a48" },
  email: { bg: "#f6e7e2", color: "var(--accent)" },
  other: { bg: "#efe9e2", color: "#6a5f54" },
};

/** SVG icon for the activity kind: phone / envelope. 15×15, stroke=currentColor. */
function TimelineIcon({ kind }: { kind: DrawerTimelineKind }) {
  if (kind === "call") {
    return (
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

/**
 * Side-drawer for a deal card (REQ-6, #156). Opens from the URL `?deal=<id>` —
 * clicking a board card adds the param, the drawer slides in from the right WITHOUT
 * leaving the list. Deep-link: navigating directly to `/deals?deal=<id>` opens the
 * panel right away. Closing — Esc and clicking outside the panel (both remove
 * `?deal` from the URL). RBAC — on the server: `getDealDrawerData` returns null for
 * an inaccessible deal, and the drawer shows "no access".
 *
 * Presentation 1:1 with the warm "CRM Pro UI" prototype: a "DEAL" label + colored
 * health badge + close button in the header, title "“Client” — product", meta line
 * (avatar · last name · days on stage), stage track as a vertical stepper, a glass
 * card with key fields (Goal / Current stage / Comment), an activity timeline with
 * colored icons, a dark button at the bottom.
 */
export function DealDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dealId = searchParams.get("deal");

  const [data, setData] = useState<DealDrawerData | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "denied">("idle");

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("deal");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!dealId) {
      setData(null);
      setState("idle");
      return;
    }
    let cancelled = false;
    setState("loading");
    setData(null);
    void getDealDrawerData(dealId).then((result) => {
      if (cancelled) {
        return;
      }
      if (result) {
        setData(result);
        setState("idle");
      } else {
        setState("denied");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [dealId]);

  useEffect(() => {
    if (!dealId) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dealId, close]);

  if (!dealId) {
    return null;
  }

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 850,
        background: "rgba(24,18,14,0.4)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex",
        justifyContent: "flex-end",
        fontFamily: "Arial",
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Deal card"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: 440,
          maxWidth: "100%",
          height: "100%",
          background: "rgba(248,243,239,0.97)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          boxShadow: "-12px 0 40px rgba(40,30,25,0.2)",
          overflowY: "auto",
          padding: "24px 26px",
          boxSizing: "border-box",
        }}
      >
        {/* Header: "DEAL" label on the left + close button on the right */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ font: "600 11px Arial", color: "#9a9ea8", letterSpacing: "1px" }}>
              DEAL
            </span>
            {/* Colored health badge for the deal (skipped for neutral/terminal deals) */}
            {data && HEALTH_BADGE[data.health] ? (
              <span
                style={{
                  background: HEALTH_BADGE[data.health]!.bg,
                  color: HEALTH_BADGE[data.health]!.color,
                  font: "600 11px Arial",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {HEALTH_BADGE[data.health]!.label}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#9a9ea8",
              cursor: "pointer",
              font: "400 22px Arial",
              border: "none",
              background: "transparent",
              padding: 0,
            }}
          >
            ×
          </button>
        </div>

        {state === "loading" ? (
          <p style={{ font: "400 13px Arial", color: "#6b6f78", margin: 0 }}>Loading…</p>
        ) : null}

        {state === "denied" ? (
          <p style={{ font: "400 13px Arial", color: "var(--accent)", margin: 0 }}>
            Deal is unavailable or not found.
          </p>
        ) : null}

        {data ? (
          <div>
            {/* Title "“Client” — product" (from data.title) */}
            <div style={{ font: "700 21px Arial", letterSpacing: "-.3px", color: "#16181d" }}>
              {data.title}
            </div>

            {/* Meta line: avatar + owner's last name · days on stage */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                margin: "9px 0 20px",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  font: "600 13px Arial",
                  color: "#16181d",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    background: data.managerBg,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "700 10px Arial",
                  }}
                >
                  {data.managerInitials}
                </span>
                {data.managerName}
              </span>
              <span
                style={{ width: 4, height: 4, borderRadius: "50%", background: "#cfd2d8" }}
                aria-hidden
              />
              <span style={{ font: "400 13px Arial", color: "#6b6f78" }}>
                {(() => {
                  const days = demoDaysOnStage(data.id, data.health);
                  return `${days} ${daysWord(days)} on stage`;
                })()}
              </span>
            </div>

            {/* Outcome badge for a completed deal (Won/Lost) */}
            {data.outcome ? (
              <div style={{ marginBottom: 18 }}>
                <span
                  className={`badge outcome-badge outcome-badge--${data.outcome.outcome}`}
                  style={{
                    background: data.outcome.bg,
                    color: data.outcome.color,
                    font: "600 11px Arial",
                    padding: "5px 12px",
                    borderRadius: 999,
                  }}
                >
                  Outcome: {data.outcome.label}
                </span>
              </div>
            ) : null}

            {/* Track label */}
            <div style={{ font: "600 12px Arial", color: "#6b6f78", marginBottom: 13 }}>
              Stage track
            </div>

            {/* Stage track — a vertical stepper (circles + connecting lines).
                The current stage = the accent track pill (color "#fff"); its index
                is derived from the already-computed colors in data.track (no new fields). */}
            {(() => {
              const currentIndex = data.track.findIndex((stage) => stage.color === "#fff");
              const lastIndex = data.track.length - 1;
              return (
                <div style={{ marginBottom: 20 }}>
                  {data.track.map((stage, index) => {
                    const step = stepperStyle(stage, index, currentIndex);
                    return (
                      <div key={stage.label} style={{ display: "flex", gap: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            flex: "none",
                          }}
                        >
                          <div
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              background: step.circleBg,
                              color: step.circleC,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              font: "700 12px Arial",
                            }}
                          >
                            {step.mark}
                          </div>
                          {index < lastIndex ? (
                            <div
                              style={{
                                width: 2,
                                flex: 1,
                                minHeight: 15,
                                background: step.lineBg,
                                borderRadius: 2,
                              }}
                            />
                          ) : null}
                        </div>
                        <div style={{ paddingBottom: 15, minWidth: 0 }}>
                          <div
                            style={{
                              font: `${step.labelW} 13px Arial`,
                              color: step.labelC,
                              lineHeight: 1.25,
                            }}
                          >
                            {stage.label}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Glass card with key fields: Goal / Current stage / Comment */}
            <div
              style={{
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(22px) saturate(1.3)",
                WebkitBackdropFilter: "blur(22px) saturate(1.3)",
                border: "1px solid rgba(255,255,255,0.7)",
                boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
                borderRadius: 18,
                padding: 16,
                marginBottom: 18,
              }}
            >
              <div
                className="r-stack"
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 14,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 7 }}>
                    Goal
                  </div>
                  <span
                    style={{
                      background: "#efe9e2",
                      color: "#6a5f54",
                      font: "600 11px Arial",
                      padding: "4px 11px",
                      borderRadius: 999,
                    }}
                  >
                    {data.goalLabel}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 7 }}>
                    Current stage
                  </div>
                  <div style={{ font: "600 14px Arial", color: "#16181d", lineHeight: 1.3 }}>
                    {data.stageLabel}
                  </div>
                </div>
                {data.comment ? (
                  <div style={{ gridColumn: "span 2", minWidth: 0 }}>
                    <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>
                      Comment
                    </div>
                    <div
                      style={{
                        font: "400 13px Arial",
                        color: "#16181d",
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {data.comment}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Technologist status on the "Testing" stage (item 17, #394) */}
            {data.techRequestStatus ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  borderRadius: 14,
                  padding: "10px 16px",
                  marginBottom: 18,
                }}
              >
                <span style={{ font: "400 12px Arial", color: "#9a9ea8" }}>Technologist</span>
                <span
                  style={{
                    background:
                      data.techRequestStatus.status === "done"
                        ? "#efe9e2"
                        : data.techRequestStatus.status === "in_progress"
                          ? "#e7f5ee"
                          : "#fbf1d6",
                    color:
                      data.techRequestStatus.status === "done"
                        ? "#6a5f54"
                        : data.techRequestStatus.status === "in_progress"
                          ? "#197a48"
                          : "#9a6a00",
                    font: "600 11px Arial",
                    padding: "4px 11px",
                    borderRadius: 999,
                  }}
                >
                  {data.techRequestStatus.label}
                </span>
              </div>
            ) : null}

            <div style={{ font: "600 12px Arial", color: "#6b6f78", marginBottom: 12 }}>
              Activity timeline
            </div>

            {/* Activity timeline with colored icons */}
            {data.timeline.length > 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  marginBottom: 22,
                }}
              >
                {data.timeline.map((item) => {
                  const colors = TIMELINE_ICON_COLORS[item.kind];
                  return (
                    <div key={item.id} style={{ display: "flex", gap: 11 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 9,
                          background: colors.bg,
                          color: colors.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "none",
                        }}
                        title={item.kindLabel}
                      >
                        <TimelineIcon kind={item.kind} />
                      </div>
                      <div>
                        <div style={{ font: "500 13px Arial", color: "#16181d" }}>{item.text}</div>
                        <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>
                          {item.author} · {formatDateTime(item.at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ font: "400 13px Arial", color: "#9a9ea8", marginBottom: 22 }}>
                No activity yet.
              </p>
            )}

            {/* Full-width dark button linking to the full deal page */}
            <Link
              href={`/deals/${data.id}`}
              style={{
                display: "block",
                width: "100%",
                border: "none",
                background: "#1c1f27",
                color: "#fff",
                font: "600 13px Arial",
                padding: 12,
                borderRadius: 14,
                cursor: "pointer",
                textAlign: "center",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              Open full deal page
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
