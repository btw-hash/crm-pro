import type { DealStage } from "./deal-stage";

/** Deal step-completion signals (from the workspace: audit/samples/test act). */
export interface StageProgressInput {
  readonly stage: DealStage;
  readonly hasAudit: boolean;
  readonly sampleCount: number;
  readonly hasTestAct: boolean;
}

/**
 * What's expected to be done at the CURRENT deal stage but isn't done yet — for a
 * hint on the card (a soft reminder, not a block: the decision is up to the
 * human). `null` — the stage has no required action on the card, or it's already
 * done. Deterministic.
 */
export function currentStageTodo(input: StageProgressInput): string | null {
  switch (input.stage) {
    case "audit":
      return input.hasAudit ? null : "Tech request not submitted yet — fill it in at this stage.";
    case "testing":
      return input.hasTestAct ? null : "Test act not recorded yet.";
    default:
      // qualification / quote / completed — no required action on the card.
      return null;
  }
}
