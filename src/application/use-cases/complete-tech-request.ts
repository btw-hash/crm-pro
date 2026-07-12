import type { DealRepository } from "@/application/ports/deal-repository";
import type { Notifier } from "@/application/ports/notifier";
import type { TechRequestRepository } from "@/application/ports/tech-request-repository";
import { complete, type TechRequest, type TechRequestId } from "@/domain/tech-request/tech-request";
import { TechRequestNotFoundError } from "./take-tech-request";

export interface CompleteTechRequestInput {
  readonly requestId: TechRequestId;
}

export type CompleteTechRequest = (input: CompleteTechRequestInput) => Promise<TechRequest>;

export function makeCompleteTechRequest(deps: {
  techRequests: TechRequestRepository;
  deals: DealRepository;
  notifier: Notifier;
}): CompleteTechRequest {
  return async function completeTechRequest(input) {
    const req = await deps.techRequests.findById(input.requestId);
    if (!req) {
      throw new TechRequestNotFoundError(input.requestId);
    }
    const updated = complete(req);
    await deps.techRequests.save(updated);
    const deal = await deps.deals.findById(updated.dealId);
    if (deal) {
      await deps.notifier.notify({
        recipientId: deal.responsibleManagerId,
        message: `The technologist completed the tech request for the deal "${deal.title}". Review the result and plan the next step.`,
        dealId: deal.id,
      });
    }
    return updated;
  };
}
