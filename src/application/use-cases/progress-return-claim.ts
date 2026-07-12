import type { ClientRepository } from "@/application/ports/client-repository";
import type { ReturnClaimRepository } from "@/application/ports/return-claim-repository";
import {
  advanceReturn,
  type ReturnClaim,
  ReturnClaimError,
  type ReturnClaimId,
  rejectReturn,
} from "@/domain/return-claim/return-claim";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export interface ProgressReturnInput {
  readonly viewer: Viewer;
  readonly id: ReturnClaimId;
}

export type ProgressReturnClaim = (input: ProgressReturnInput) => Promise<ReturnClaim>;

interface Deps {
  clients: ClientRepository;
  returns: ReturnClaimRepository;
}

/** Loads the return and checks the caller is allowed to manage it (manager owner-boundary). */
async function loadOwned(deps: Deps, viewer: Viewer, id: ReturnClaimId): Promise<ReturnClaim> {
  const claim = await deps.returns.findById(id);
  if (!claim) {
    throw new ReturnClaimError("Return not found");
  }
  if (isOwnerScoped(viewer.role)) {
    const client = await deps.clients.findById(claim.clientId);
    if (!client || client.responsibleManagerId !== viewer.id) {
      throw new ReturnClaimError("Return belongs to another manager's client");
    }
  }
  return claim;
}

/** Advances the return to the next process stage. */
export function makeAdvanceReturnClaim(deps: Deps): ProgressReturnClaim {
  return async ({ viewer, id }) => {
    const next = advanceReturn(await loadOwned(deps, viewer, id));
    await deps.returns.save(next);
    return next;
  };
}

/** Rejects the return (only before the invoice is issued). */
export function makeRejectReturnClaim(deps: Deps): ProgressReturnClaim {
  return async ({ viewer, id }) => {
    const next = rejectReturn(await loadOwned(deps, viewer, id));
    await deps.returns.save(next);
    return next;
  };
}
