import type { AuditRepository } from "@/application/ports/audit-repository";
import type { AuditId, DecisionMaker, ProductionAudit } from "@/domain/audit/production-audit";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import { prisma } from "./prisma-client";

function toAudit(row: {
  id: string;
  dealId: string;
  clientId: string;
  equipment: string[];
  painPoints: string[];
  decisionMakers: unknown;
  notes: string | null;
  createdBy: string;
  createdAt: Date;
}): ProductionAudit {
  return {
    id: row.id as AuditId,
    dealId: row.dealId as DealId,
    clientId: row.clientId as ClientId,
    equipment: row.equipment,
    painPoints: row.painPoints,
    decisionMakers: row.decisionMakers as readonly DecisionMaker[],
    ...(row.notes != null ? { notes: row.notes } : {}),
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

export class PrismaAuditRepository implements AuditRepository {
  async save(audit: ProductionAudit): Promise<void> {
    await prisma.productionAudit.upsert({
      where: { id: audit.id },
      create: {
        id: audit.id,
        dealId: audit.dealId,
        clientId: audit.clientId,
        equipment: [...audit.equipment],
        painPoints: [...audit.painPoints],
        decisionMakers: audit.decisionMakers as unknown as object[],
        notes: audit.notes ?? null,
        createdBy: audit.createdBy,
        createdAt: new Date(audit.createdAt),
      },
      update: {
        equipment: [...audit.equipment],
        painPoints: [...audit.painPoints],
        decisionMakers: audit.decisionMakers as unknown as object[],
        notes: audit.notes ?? null,
      },
    });
  }

  async update(audit: ProductionAudit): Promise<void> {
    await prisma.productionAudit.update({
      where: { id: audit.id },
      data: {
        equipment: [...audit.equipment],
        painPoints: [...audit.painPoints],
        decisionMakers: audit.decisionMakers as unknown as object[],
        notes: audit.notes ?? null,
      },
    });
  }

  async findById(id: AuditId): Promise<ProductionAudit | null> {
    const row = await prisma.productionAudit.findUnique({ where: { id } });
    return row ? toAudit(row) : null;
  }

  async findByDealId(dealId: DealId): Promise<ProductionAudit | null> {
    const row = await prisma.productionAudit.findUnique({ where: { dealId } });
    return row ? toAudit(row) : null;
  }
}
