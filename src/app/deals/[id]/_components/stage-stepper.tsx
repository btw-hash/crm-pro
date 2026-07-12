import {
  DEAL_STAGE_LABELS,
  FUNNEL_TRACK,
  isTerminal,
  type DealStage,
} from "@/domain/deal/deal-stage";

/** Stepper step state relative to the deal's current stage. */
export type StepState = "done" | "current" | "upcoming";

/**
 * States of all funnel-track steps for the given stage. Past ones — `done`,
 * the current one — `current`, future ones — `upcoming`. For a completed deal
 * (`completed`) the terminal step itself is marked `done`, not `current` — the
 * funnel has been completed in full.
 */
export function stepStates(stage: DealStage): readonly StepState[] {
  const currentIndex = FUNNEL_TRACK.indexOf(stage);
  const terminalDone = isTerminal(stage);
  return FUNNEL_TRACK.map((_, i) => {
    if (i < currentIndex) return "done";
    if (i > currentIndex) return "upcoming";
    return terminalDone ? "done" : "current";
  });
}

const CIRCLE: Record<StepState, { bg: string; color: string }> = {
  done: { bg: "#1c1f27", color: "#fff" },
  current: { bg: "#bf322b", color: "#fff" },
  upcoming: { bg: "#ece6df", color: "#9a9ea8" },
};
const LABEL: Record<StepState, { weight: number; color: string }> = {
  done: { weight: 600, color: "#16181d" },
  current: { weight: 700, color: "#16181d" },
  upcoming: { weight: 400, color: "#9a9ea8" },
};

const Check = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#fff"
    strokeWidth={3}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/**
 * Deal-stage stepper following the real 6-stage funnel track (`FUNNEL_TRACK` /
 * `DEAL_STAGE_LABELS`) — a single source shared with the kanban and the domain,
 * with no separate "design" model of stages. Presentational, no interactivity.
 */
export function StageStepper({ stage }: { stage: DealStage }) {
  const states = stepStates(stage);
  return (
    <div
      style={{ display: "flex", alignItems: "flex-start", margin: "24px 4px 2px" }}
      aria-label="Deal stages"
    >
      {FUNNEL_TRACK.map((s, i) => {
        const state = states[i] ?? "upcoming";
        const circle = CIRCLE[state];
        const label = LABEL[state];
        const last = i === FUNNEL_TRACK.length - 1;
        const lineDone = states[i + 1] === "done" || states[i + 1] === "current";
        return (
          <div key={s} style={{ display: "contents" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: 78,
                flex: "none",
              }}
              aria-current={state === "current" ? "step" : undefined}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  background: circle.bg,
                  color: circle.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  font: "700 13px Arial",
                  flex: "none",
                }}
              >
                {state === "done" ? Check : i + 1}
              </div>
              <div
                style={{
                  font: `${label.weight} 11px/1.25 Arial`,
                  color: label.color,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {DEAL_STAGE_LABELS[s]}
              </div>
            </div>
            {last ? null : (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: lineDone ? "#1c1f27" : "#d8d2ca",
                  marginTop: 14,
                  borderRadius: 2,
                }}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
