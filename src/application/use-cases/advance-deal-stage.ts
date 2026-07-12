import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { FollowUpTaskCreator } from "@/application/ports/follow-up-task-creator";
import type { Notifier } from "@/application/ports/notifier";
import { advanceDeal, type Deal, type DealId } from "@/domain/deal/deal";
import { DEAL_STAGE_LABELS, type DealStage } from "@/domain/deal/deal-stage";
import { triggerForStage } from "@/domain/deal/stage-triggers";

export class DealNotFoundError extends Error {
  constructor(readonly dealId: DealId) {
    super(`Deal not found: ${dealId}`);
    this.name = "DealNotFoundError";
  }
}

export interface AdvanceDealStageInput {
  readonly dealId: DealId;
  readonly to: DealStage;
  /** Who initiated the transition - recorded in the event log. */
  readonly actor: string;
}

export type AdvanceDealStage = (input: AdvanceDealStageInput) => Promise<Deal>;

/**
 * Moves a deal through the pipeline; the domain checks whether the transition is
 * allowed. At key stages a trigger fires: an auto-task for the responsible manager +
 * a notification (the "robots" pattern, see `triggerForStage`).
 */
export function makeAdvanceDealStage(deps: {
  deals: DealRepository;
  events: DealEventRecorder;
  tasks: FollowUpTaskCreator;
  notifier: Notifier;
}): AdvanceDealStage {
  return async function advanceDealStage({ dealId, to, actor }) {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    const updated = advanceDeal(deal, to);
    await deps.deals.save(updated);
    await deps.events.record({
      dealId,
      type: "stage_changed",
      summary: `Stage: ${DEAL_STAGE_LABELS[deal.stage]} → ${DEAL_STAGE_LABELS[to]}`,
      actor,
      fromStage: deal.stage,
      toStage: to,
    });
    const trigger = triggerForStage(to);
    if (trigger) {
      await deps.tasks.create({
        dealId,
        assignee: deal.responsibleManagerId,
        text: trigger.taskText,
        dueInDays: trigger.dueInDays,
      });
      await deps.notifier.notify({
        recipientId: deal.responsibleManagerId,
        message: `Deal "${deal.title}" → ${DEAL_STAGE_LABELS[to]}. Next step: ${trigger.taskText}.`,
        dealId,
      });
    }
    return updated;
  };
}
