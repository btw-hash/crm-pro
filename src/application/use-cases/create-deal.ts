import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { ClientId } from "@/domain/client/client";
import { createDeal, type Deal } from "@/domain/deal/deal";
import type { DealGoal } from "@/domain/deal/deal-goal";
import type { DealType } from "@/domain/deal/deal-type";
import { makeId } from "@/domain/shared/id";

export class ClientNotFoundError extends Error {
  constructor(readonly clientId: ClientId) {
    super(`Client not found: ${clientId}`);
    this.name = "ClientNotFoundError";
  }
}

export interface CreateDealInput {
  readonly clientId: ClientId;
  readonly title: string;
  readonly responsibleManagerId: string;
  readonly goal?: DealGoal;
  readonly type?: DealType;
  readonly comment?: string;
}

export type CreateDeal = (input: CreateDealInput) => Promise<Deal>;

export function makeCreateDeal(deps: {
  deals: DealRepository;
  clients: ClientRepository;
}): CreateDeal {
  return async function createDealUseCase(input) {
    const client = await deps.clients.findById(input.clientId);
    if (!client) {
      throw new ClientNotFoundError(input.clientId);
    }
    const deal = createDeal({
      id: makeId<"DealId">(crypto.randomUUID()),
      clientId: input.clientId,
      title: input.title,
      responsibleManagerId: input.responsibleManagerId,
      goal: input.goal,
      type: input.type,
      comment: input.comment,
    });
    await deps.deals.save(deal);
    return deal;
  };
}
