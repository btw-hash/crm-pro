import type { PackingRequestRepository } from "@/application/ports/packing-request-repository";
import {
  advancePacking,
  createPackingRequest,
  type CreatePackingRequestInput,
  type PackingRequest,
  PackingRequestError,
  type PackingRequestId,
} from "@/domain/packing/packing-request";

export type ListPackingRequests = () => Promise<readonly PackingRequest[]>;

/** Queue of packing requests (newest on top). */
export function makeListPackingRequests(deps: {
  packing: PackingRequestRepository;
}): ListPackingRequests {
  return () => deps.packing.list();
}

export type FilePackingRequest = (input: CreatePackingRequestInput) => Promise<PackingRequest>;

/** Files a packing request (item, source → target packing). */
export function makeFilePackingRequest(deps: {
  packing: PackingRequestRepository;
}): FilePackingRequest {
  return async (input) => {
    const request = createPackingRequest(input);
    await deps.packing.save(request);
    return request;
  };
}

export type AdvancePackingRequest = (input: { id: PackingRequestId }) => Promise<PackingRequest>;

/** Advances a packing request to the next stage (created→in progress→done). */
export function makeAdvancePackingRequest(deps: {
  packing: PackingRequestRepository;
}): AdvancePackingRequest {
  return async ({ id }) => {
    const request = await deps.packing.findById(id);
    if (!request) {
      throw new PackingRequestError("Packing request not found");
    }
    const next = advancePacking(request);
    await deps.packing.save(next);
    return next;
  };
}
