import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { ClientId } from "@/domain/client/client";
import { type Deal, type DealId, updateDealDetails } from "@/domain/deal/deal";
import type { DealGoal } from "@/domain/deal/deal-goal";
import { DealNotFoundError } from "./advance-deal-stage";
import { ClientNotFoundError } from "./create-deal";

export interface UpdateDealInput {
  readonly dealId: DealId;
  readonly title?: string;
  readonly clientId?: ClientId;
  readonly responsibleManagerId?: string;
  readonly goal?: DealGoal;
  readonly comment?: string;
}

export type UpdateDeal = (input: UpdateDealInput) => Promise<Deal>;

export function makeUpdateDeal(deps: {
  deals: DealRepository;
  clients: ClientRepository;
}): UpdateDeal {
  return async function updateDealUseCase(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    if (input.clientId !== undefined) {
      const client = await deps.clients.findById(input.clientId);
      if (!client) {
        throw new ClientNotFoundError(input.clientId);
      }
    }
    const updated = updateDealDetails(deal, {
      title: input.title,
      clientId: input.clientId,
      responsibleManagerId: input.responsibleManagerId,
      goal: input.goal,
      comment: input.comment,
    });
    await deps.deals.save(updated);
    return updated;
  };
}
