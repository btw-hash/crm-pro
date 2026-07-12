import type { ClientId } from "@/domain/client/client";
import type { ReturnClaim, ReturnClaimId } from "@/domain/return-claim/return-claim";

export interface ReturnClaimRepository {
  save(claim: ReturnClaim): Promise<void>;
  findById(id: ReturnClaimId): Promise<ReturnClaim | null>;
  /** Client's return claims, newest first. */
  listByClient(clientId: ClientId): Promise<readonly ReturnClaim[]>;
}
