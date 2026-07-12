import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { DealId } from "@/domain/deal/deal";
import { DEAL_GOAL_LABELS, type DealGoal } from "@/domain/deal/deal-goal";
import { DealNotFoundError } from "./advance-deal-stage";

export interface SetDealGoalInput {
  readonly dealId: DealId;
  readonly goal: DealGoal;
  /** Who is changing the goal — for the history record. */
  readonly actor: string;
}

export type SetDealGoal = (input: SetDealGoalInput) => Promise<void>;

/**
 * Sets the deal's goal (edited by a human; no AI arbitration — Phase 2).
 * Writes a `goal_set` event to the process history (#397 item 23: "everything we do has a history").
 */
export function makeSetDealGoal(deps: {
  deals: DealRepository;
  events: DealEventRecorder;
}): SetDealGoal {
  return async function setDealGoal({ dealId, goal, actor }) {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    await deps.deals.save({ ...deal, goal });
    await deps.events.record({
      dealId,
      type: "goal_set",
      summary: `Goal: ${DEAL_GOAL_LABELS[goal]}`,
      actor,
    });
  };
}
