import type { ReturnClaimRepository } from "@/application/ports/return-claim-repository";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type {
  ReturnClaim,
  ReturnClaimId,
  ReturnReason,
  ReturnStatus,
} from "@/domain/return-claim/return-claim";
import { prisma } from "./prisma-client";

function toReturnClaim(row: {
  id: string;
  clientId: string;
  dealId: string | null;
  productName: string;
  quantity: number;
  unit: string;
  reason: string;
  comment: string | null;
  status: string;
  createdBy: string;
  createdAt: Date;
}): ReturnClaim {
  return {
    id: row.id as ReturnClaimId,
    clientId: row.clientId as ClientId,
    dealId: row.dealId as DealId | null,
    productName: row.productName,
    quantity: row.quantity,
    unit: row.unit,
    reason: row.reason as ReturnReason,
    comment: row.comment,
    status: row.status as ReturnStatus,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaReturnClaimRepository implements ReturnClaimRepository {
  async save(claim: ReturnClaim): Promise<void> {
    await prisma.returnClaim.upsert({
      where: { id: claim.id },
      create: {
        id: claim.id,
        clientId: claim.clientId,
        dealId: claim.dealId,
        productName: claim.productName,
        quantity: claim.quantity,
        unit: claim.unit,
        reason: claim.reason,
        comment: claim.comment,
        status: claim.status,
        createdBy: claim.createdBy,
        createdAt: new Date(claim.createdAt),
      },
      update: {
        status: claim.status,
        comment: claim.comment,
      },
    });
  }

  async findById(id: ReturnClaimId): Promise<ReturnClaim | null> {
    const row = await prisma.returnClaim.findUnique({ where: { id } });
    return row ? toReturnClaim(row) : null;
  }

  async listByClient(clientId: ClientId): Promise<readonly ReturnClaim[]> {
    const rows = await prisma.returnClaim.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toReturnClaim);
  }
}
