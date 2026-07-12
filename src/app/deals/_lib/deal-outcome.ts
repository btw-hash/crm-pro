import type { Deal } from "@/domain/deal/deal";
import {
  DEAL_OUTCOME_LABELS,
  DEAL_STAGES,
  type DealOutcome,
  type DealStage,
  type SectionVisibility,
  sectionVisibility,
} from "@/domain/deal/deal-stage";

/** Stage rank by funnel order (derived locally from DEAL_STAGES — don't reach into the private FUNNEL_RANK). */
function stageRank(stage: DealStage): number {
  return DEAL_STAGES.indexOf(stage);
}

/** Presentation of a completed deal's outcome badge (color for the warm theme). */
export interface OutcomeBadge {
  readonly outcome: DealOutcome;
  readonly label: string;
  readonly bg: string;
  readonly color: string;
}

const OUTCOME_BADGE: Record<DealOutcome, Omit<OutcomeBadge, "outcome" | "label">> = {
  won: { bg: "#e7f5ee", color: "#197a48" },
  lost: { bg: "#f7e4e2", color: "var(--accent)" },
};

/**
 * Outcome badge for a completed deal: "Won" (green) / "Lost" (accent). `null` —
 * the deal has no outcome (not completed, or outcome not set), no badge is shown.
 * Labels — the single source DEAL_OUTCOME_LABELS.
 */
export function outcomeBadge(deal: Pick<Deal, "outcome">): OutcomeBadge | null {
  const outcome = deal.outcome;
  if (!outcome) {
    return null;
  }
  return {
    outcome,
    label: DEAL_OUTCOME_LABELS[outcome],
    ...OUTCOME_BADGE[outcome],
  };
}

/** Deal artifacts used to estimate the actually-reached stage (lost-deal progress, #28). */
export interface ReachedStageInput {
  readonly hasAudit: boolean;
  readonly sampleCount: number;
  readonly hasTestAct: boolean;
}

/**
 * The latest stage for which a completed deal actually has data — for correct
 * progress display on a lost deal (#28). A test act → reached "Tech response";
 * samples/audit → "Tech request"; otherwise — "Qualification". Deterministic,
 * without events.
 */
export function reachedStage(input: ReachedStageInput): DealStage {
  if (input.hasTestAct) {
    return "testing";
  }
  if (input.sampleCount > 0) {
    return "audit";
  }
  if (input.hasAudit) {
    return "audit";
  }
  return "qualification";
}

/**
 * Card-section visibility ACCOUNTING FOR the outcome (#28). The base
 * `sectionVisibility` computes it by stage rank: for a completed deal ALL
 * preceding sections are "completed", even if a lost deal SKIPPED a stage (e.g.
 * closed lost after a failed test, bypassing "Proposal"). For a lost deal, a
 * section past the last actually-reached stage is not marked "completed" —
 * we show "locked" (never happened). For won and active deals — unchanged base
 * behavior.
 *
 * Heuristic for the "last reached stage" on lost: the loss is recorded at
 * whatever stage the deal stopped on. Without a transition event we don't know
 * the exact stage on the card, so we rely on the presence of artifacts (a test
 * act = reached testing). The `reachedStage` parameter is the latest stage with
 * data/an event.
 */
export function sectionVisibilityForDeal(
  section: DealStage,
  deal: Pick<Deal, "stage" | "outcome">,
  reachedStage: DealStage,
): SectionVisibility {
  const base = sectionVisibility(section, deal.stage);
  // Only adjust lost completed deals, and only sections the base logic
  // considers "completed" but that lie AFTER the actually-reached stage (i.e.
  // were skipped by an early close).
  if (deal.stage === "completed" && deal.outcome === "lost" && base === "readonly") {
    if (stageRank(section) > stageRank(reachedStage)) {
      return "locked";
    }
  }
  return base;
}
