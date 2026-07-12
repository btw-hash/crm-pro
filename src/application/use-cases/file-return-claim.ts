import type { ClientRepository } from "@/application/ports/client-repository";
import type { ReturnClaimRepository } from "@/application/ports/return-claim-repository";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import {
  createReturnClaim,
  type ReturnClaim,
  ReturnClaimError,
  type ReturnClaimId,
  type ReturnReason,
} from "@/domain/return-claim/return-claim";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export interface FileReturnClaimInput {
  readonly viewer: Viewer;
  readonly id: ReturnClaimId;
  readonly clientId: ClientId;
  readonly dealId?: DealId | null;
  readonly productName: string;
  readonly quantity: number;
  readonly unit?: string;
  readonly reason: ReturnReason;
  readonly comment?: string | null;
  readonly createdAt: string;
}

export type FileReturnClaim = (input: FileReturnClaimInput) => Promise<ReturnClaim>;

/**
 * Files a return claim against a client. A Manager can only file a return
 * for their own client (owner boundary); a Head of Sales can for anyone.
 * ERP numbers/documents come later, behind a port.
 */
export function makeFileReturnClaim(deps: {
  clients: ClientRepository;
  returns: ReturnClaimRepository;
}): FileReturnClaim {
  return async (input) => {
    const client = await deps.clients.findById(input.clientId);
    if (!client) {
      throw new ReturnClaimError("Client not found");
    }
    if (isOwnerScoped(input.viewer.role) && client.responsibleManagerId !== input.viewer.id) {
      throw new ReturnClaimError("You can only file a return for your own client");
    }
    const claim = createReturnClaim({
      id: input.id,
      clientId: input.clientId,
      dealId: input.dealId ?? null,
      productName: input.productName,
      quantity: input.quantity,
      unit: input.unit,
      reason: input.reason,
      comment: input.comment ?? null,
      createdBy: input.viewer.id,
      createdAt: input.createdAt,
    });
    await deps.returns.save(claim);
    return claim;
  };
}
