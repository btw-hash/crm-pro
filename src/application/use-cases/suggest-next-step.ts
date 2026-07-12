import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AiGateway } from "@/application/ports/ai-gateway";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { DealId } from "@/domain/deal/deal";
import { DEAL_GOAL_LABELS, DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { DEAL_STAGE_LABELS } from "@/domain/deal/deal-stage";
import { DealNotFoundError } from "./advance-deal-stage";

const RECENT_LIMIT = 5;

export type SuggestNextStep = (input: { dealId: DealId }) => Promise<{ suggestion: string }>;

/**
 * AI "next step" advisor: gathers deterministic deal context (stage, goal, client,
 * recent activities) and asks the AI to suggest ONE concrete step. The suggestion is
 * edited and confirmed by a human (saving is a separate step, as a task).
 */
export function makeSuggestNextStep(deps: {
  deals: DealRepository;
  clients: ClientRepository;
  activities: ActivityRepository;
  ai: AiGateway;
}): SuggestNextStep {
  return async ({ dealId }) => {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    const [client, activities] = await Promise.all([
      deps.clients.findById(deal.clientId),
      deps.activities.listByDeal(dealId),
    ]);
    return deps.ai.suggestNextStep({
      dealTitle: deal.title,
      clientName: client?.name ?? "—",
      stage: DEAL_STAGE_LABELS[deal.stage],
      goal: DEAL_GOAL_LABELS[deal.goal ?? DEFAULT_DEAL_GOAL],
      // listByDeal — newest first; we take the recent ones as history.
      recentActivities: activities.slice(0, RECENT_LIMIT).map((activity) => activity.text),
    });
  };
}
