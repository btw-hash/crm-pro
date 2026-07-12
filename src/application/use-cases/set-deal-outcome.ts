import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { DealRepository } from "@/application/ports/deal-repository";
import { type Deal, type DealId, setDealOutcome } from "@/domain/deal/deal";
import { DEAL_OUTCOME_LABELS, type DealOutcome } from "@/domain/deal/deal-stage";
import { DealNotFoundError } from "./advance-deal-stage";

export interface SetDealOutcomeInput {
  readonly dealId: DealId;
  readonly outcome: DealOutcome;
  /** Who recorded the outcome — for the history record. */
  readonly actor: string;
}

export type SetDealOutcome = (input: SetDealOutcomeInput) => Promise<Deal>;

/**
 * Records the outcome of a completed deal (Won/Lost) and writes an event to the history.
 * Validity (only on "Completed") is checked by the domain (`setDealOutcome`).
 */
export function makeSetDealOutcome(deps: {
  deals: DealRepository;
  events: DealEventRecorder;
}): SetDealOutcome {
  return async ({ dealId, outcome, actor }) => {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    const updated = setDealOutcome(deal, outcome);
    await deps.deals.save(updated);
    await deps.events.record({
      dealId,
      type: "outcome_set",
      summary: `Deal outcome: ${DEAL_OUTCOME_LABELS[outcome]}`,
      actor,
    });
    return updated;
  };
}
