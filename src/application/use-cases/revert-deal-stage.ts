import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { DealRepository } from "@/application/ports/deal-repository";
import { revertDeal, type Deal, type DealId } from "@/domain/deal/deal";
import { DealStageRevertError } from "@/domain/deal/deal";
import { DEAL_STAGE_LABELS, type DealStage } from "@/domain/deal/deal-stage";
import { DealNotFoundError } from "./advance-deal-stage";

export interface RevertDealStageInput {
  readonly dealId: DealId;
  readonly toStage: DealStage;
  readonly reason?: string;
  readonly revertedBy: string;
}

export type RevertDealStage = (input: RevertDealStageInput) => Promise<Deal>;

/**
 * Reverts a deal to an earlier pipeline stage (fixing a transition mistake).
 * Logs the revert as a `stage_reverted` event with a reason. Forward
 * triggers/notifications do NOT fire — this is an explicit correction, not
 * regular progress.
 */
export function makeRevertDealStage(deps: {
  deals: DealRepository;
  events: DealEventRecorder;
}): RevertDealStage {
  return async function revertDealStage({ dealId, toStage, reason, revertedBy }) {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    const updated = revertDeal(deal, toStage);
    await deps.deals.save(updated);
    const reasonSuffix = reason ? `. Reason: ${reason}` : "";
    await deps.events.record({
      dealId,
      type: "stage_reverted",
      summary: `Revert: ${DEAL_STAGE_LABELS[deal.stage]} → ${DEAL_STAGE_LABELS[toStage]}${reasonSuffix}`,
      actor: revertedBy,
      fromStage: deal.stage,
      toStage,
    });
    return updated;
  };
}

export { DealStageRevertError };
