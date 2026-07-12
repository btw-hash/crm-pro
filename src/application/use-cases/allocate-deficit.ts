import {
  allocateDeficit as domainAllocate,
  type Allocation,
  type DeficitRequestInput,
} from "@/domain/deficit/deficit-scoring";

export interface AllocateDeficitInput {
  readonly requests: readonly DeficitRequestInput[];
  readonly availableQty: number;
}

export interface AllocateDeficitResult {
  readonly allocations: readonly Allocation[];
}

export type AllocateDeficit = (input: AllocateDeficitInput) => Promise<AllocateDeficitResult>;

/**
 * Proposes an allocation of a limited (deficit) stock across requests.
 * The result is a read-only proposal; confirmation is a separate step (passive capture).
 */
export function makeAllocateDeficit(): AllocateDeficit {
  return async (input) => {
    const allocations = domainAllocate(input.requests, input.availableQty);
    return { allocations };
  };
}
