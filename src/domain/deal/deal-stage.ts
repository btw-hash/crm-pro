/** Sales funnel stages (Puratos model, adapted for the company group). */
export const DEAL_STAGES = ["qualification", "audit", "testing", "quote", "completed"] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

/** Outcome of a completed deal (stored separately from the stage). */
export const DEAL_OUTCOMES = ["won", "lost"] as const;
export type DealOutcome = (typeof DEAL_OUTCOMES)[number];

export const DEAL_OUTCOME_LABELS: Record<DealOutcome, string> = {
  won: "Won",
  lost: "Lost",
};

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  qualification: "Qualification",
  audit: "Tech request",
  testing: "Tech response",
  quote: "Proposal",
  completed: "Completed",
};

/**
 * The visible funnel "track" in stage order — a single source for highlighting
 * the completed/current stage on the full card and in the side drawer.
 */
export const FUNNEL_TRACK: readonly DealStage[] = [...DEAL_STAGES];

/** Allowed transitions between stages. Guards against "skipping" the funnel. */
const ALLOWED_TRANSITIONS: Record<DealStage, readonly DealStage[]> = {
  qualification: ["audit", "completed"],
  audit: ["testing", "quote", "completed"],
  testing: ["quote", "completed"],
  quote: ["completed"],
  completed: [],
};

export function canTransition(from: DealStage, to: DealStage): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function isTerminal(stage: DealStage): boolean {
  return ALLOWED_TRANSITIONS[stage].length === 0;
}

const FUNNEL_RANK: Record<DealStage, number> = {
  qualification: 0,
  audit: 1,
  testing: 2,
  quote: 3,
  completed: 4,
};

export function canRevert(from: DealStage, to: DealStage): boolean {
  return !isTerminal(to) && FUNNEL_RANK[to] < FUNNEL_RANK[from];
}

/** State of a deal-card section relative to the current stage. */
export type SectionVisibility = "active" | "readonly" | "locked";

/**
 * Visibility of a card section based on its "native" stage relative to the
 * current one: past — `readonly` (show what's filled in, without forms),
 * current — `active`, future — `locked` (collapsed, unlocked as the deal
 * progresses). Completed (`completed`) — everything is read-only.
 */
export function sectionVisibility(section: DealStage, current: DealStage): SectionVisibility {
  const sectionRank = FUNNEL_RANK[section];
  const currentRank = FUNNEL_RANK[current];
  if (sectionRank < currentRank) return "readonly";
  if (sectionRank > currentRank) return "locked";
  return "active";
}
