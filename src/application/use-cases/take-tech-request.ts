import type { TechRequestRepository } from "@/application/ports/tech-request-repository";
import {
  takeInWork,
  type TechRequest,
  type TechRequestId,
} from "@/domain/tech-request/tech-request";

export class TechRequestNotFoundError extends Error {
  constructor(id: TechRequestId) {
    super(`Tech request ${id} not found`);
    this.name = "TechRequestNotFoundError";
  }
}

export interface TakeTechRequestInput {
  readonly requestId: TechRequestId;
  readonly technologistId: string;
}

export type TakeTechRequest = (input: TakeTechRequestInput) => Promise<TechRequest>;

export function makeTakeTechRequest(deps: {
  techRequests: TechRequestRepository;
}): TakeTechRequest {
  return async function takeTechRequest(input) {
    const req = await deps.techRequests.findById(input.requestId);
    if (!req) {
      throw new TechRequestNotFoundError(input.requestId);
    }
    const updated = takeInWork(req, input.technologistId);
    await deps.techRequests.save(updated);
    return updated;
  };
}
