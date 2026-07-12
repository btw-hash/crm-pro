import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { DealRepository } from "@/application/ports/deal-repository";
import { type DealId, softDeleteDeal } from "@/domain/deal/deal";
import { DealNotFoundError } from "./advance-deal-stage";

export interface DeleteDealInput {
  readonly dealId: DealId;
  /** Who deleted it — for the history record. */
  readonly actor: string;
  /** Deletion timestamp (ISO). */
  readonly at: string;
}

export type DeleteDeal = (input: DeleteDealInput) => Promise<void>;

/**
 * Soft-deletes the deal (#397 p.23): sets a `deletedAt` timestamp and records a
 * `deal_deleted` event — the record and its full history are preserved; the
 * deal is only hidden from lists. We don't hard-delete, to avoid losing the
 * audit trail.
 */
export function makeDeleteDeal(deps: {
  deals: DealRepository;
  events: DealEventRecorder;
}): DeleteDeal {
  return async function deleteDealUseCase({ dealId, actor, at }) {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    const deleted = softDeleteDeal(deal, at);
    await deps.deals.save(deleted);
    await deps.events.record({
      dealId,
      type: "deal_deleted",
      summary: `Deal "${deal.title}" deleted`,
      actor,
    });
  };
}
