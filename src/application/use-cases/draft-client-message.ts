import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AiGateway } from "@/application/ports/ai-gateway";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { DealId } from "@/domain/deal/deal";
import { DEAL_GOAL_LABELS, DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { DEAL_STAGE_LABELS } from "@/domain/deal/deal-stage";
import { DealNotFoundError } from "./advance-deal-stage";

const RECENT_LIMIT = 5;

export type DraftClientMessage = (input: {
  dealId: DealId;
  intent?: string;
}) => Promise<{ subject: string; body: string }>;

/**
 * Drafts a follow-up email to the client: gathers deterministic deal context
 * (stage, goal, client, manager, recent activities) and asks the AI to
 * compose the message. A human edits and sends it THEMSELVES (no auto-send).
 * The AI never fabricates numbers/facts. `intent` is an optional intent
 * (e.g. "follow up on the proposal").
 */
export function makeDraftClientMessage(deps: {
  deals: DealRepository;
  clients: ClientRepository;
  activities: ActivityRepository;
  ai: AiGateway;
  labelManager: (id: string) => string;
}): DraftClientMessage {
  return async ({ dealId, intent }) => {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new DealNotFoundError(dealId);
    }
    const [client, activities] = await Promise.all([
      deps.clients.findById(deal.clientId),
      deps.activities.listByDeal(dealId),
    ]);
    const message = await deps.ai.draftClientMessage({
      context: {
        clientName: client?.name ?? "—",
        dealTitle: deal.title,
        stage: DEAL_STAGE_LABELS[deal.stage],
        goal: DEAL_GOAL_LABELS[deal.goal ?? DEFAULT_DEAL_GOAL],
        managerName: deps.labelManager(deal.responsibleManagerId),
        recentActivities: activities.slice(0, RECENT_LIMIT).map((activity) => activity.text),
      },
      intent: intent && intent.trim() !== "" ? intent.trim() : null,
    });
    // Empty draft (the AI returned nothing) — not treated as success: let it
    // fail as a soft error in the action, rather than showing an empty
    // "successful" form.
    if (message.subject.trim() === "" || message.body.trim() === "") {
      throw new Error("The AI returned an empty message draft");
    }
    return message;
  };
}
