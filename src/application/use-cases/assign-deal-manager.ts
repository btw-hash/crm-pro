import type { DealRepository } from "@/application/ports/deal-repository";
import type { Notifier } from "@/application/ports/notifier";
import type { DealId } from "@/domain/deal/deal";
import { updateDealDetails } from "@/domain/deal/deal";
import type { Role } from "@/domain/shared/role";

export class AssignDealManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssignDealManagerError";
  }
}

export interface AssignDealManagerInput {
  readonly dealId: DealId;
  readonly newManagerId: string;
  readonly actorRole: Role;
  readonly actorId: string;
}

export type AssignDealManager = (input: AssignDealManagerInput) => Promise<void>;

/**
 * Reassigns a deal to another manager. Head of sales only.
 * When the owner changes, creates a notification for the new owner.
 * No-op if the manager didn't change (notification isn't duplicated).
 */
export function makeAssignDealManager(deps: {
  deals: DealRepository;
  notifier: Notifier;
}): AssignDealManager {
  return async function assignDealManager({ dealId, newManagerId, actorRole, actorId: _actorId }) {
    if (actorRole !== "head") {
      throw new AssignDealManagerError("Only the head of sales can reassign the owner.");
    }
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      throw new AssignDealManagerError(`Deal not found: ${dealId}`);
    }
    if (deal.responsibleManagerId === newManagerId) {
      return;
    }
    const updated = updateDealDetails(deal, { responsibleManagerId: newManagerId });
    await deps.deals.save(updated);
    await deps.notifier.notify({
      recipientId: newManagerId,
      message: `The head of sales handed you the deal "${deal.title}". Review it and plan the next step.`,
      dealId,
    });
  };
}
