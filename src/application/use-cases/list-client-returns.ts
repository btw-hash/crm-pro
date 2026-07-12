import type { ReturnClaimRepository } from "@/application/ports/return-claim-repository";
import type { ClientId } from "@/domain/client/client";
import type { ReturnClaim } from "@/domain/return-claim/return-claim";

export type ListClientReturns = (clientId: ClientId) => Promise<readonly ReturnClaim[]>;

/**
 * Client return claims (newest first). Role gating happens at the client card
 * level (this commercial/operational process is shown only to roles with commercial access).
 */
export function makeListClientReturns(deps: { returns: ReturnClaimRepository }): ListClientReturns {
  return (clientId) => deps.returns.listByClient(clientId);
}
