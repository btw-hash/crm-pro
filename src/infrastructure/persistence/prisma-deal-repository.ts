import type { DealListFilter, DealRepository } from "@/application/ports/deal-repository";
import type { Deal, DealId } from "@/domain/deal/deal";
import type { DealGoal } from "@/domain/deal/deal-goal";
import { isDealGoal } from "@/domain/deal/deal-goal";
import type { DealType } from "@/domain/deal/deal-type";
import { isDealType } from "@/domain/deal/deal-type";
import type { DealOutcome, DealStage } from "@/domain/deal/deal-stage";
import { DEAL_OUTCOMES } from "@/domain/deal/deal-stage";
import type { ClientId } from "@/domain/client/client";
import { prisma } from "./prisma-client";

function isDealOutcome(value: string): value is DealOutcome {
  return (DEAL_OUTCOMES as readonly string[]).includes(value);
}

function toDeal(row: {
  id: string;
  clientId: string;
  title: string;
  stage: string;
  responsibleManagerId: string;
  goal: string | null;
  type: string | null;
  outcome: string | null;
  comment: string | null;
  deletedAt: string | null;
}): Deal {
  return {
    id: row.id as DealId,
    clientId: row.clientId as ClientId,
    title: row.title,
    stage: row.stage as DealStage,
    responsibleManagerId: row.responsibleManagerId,
    ...(row.goal != null && isDealGoal(row.goal) ? { goal: row.goal as DealGoal } : {}),
    ...(row.type != null && isDealType(row.type) ? { type: row.type as DealType } : {}),
    ...(row.outcome != null && isDealOutcome(row.outcome)
      ? { outcome: row.outcome as DealOutcome }
      : {}),
    ...(row.comment != null ? { comment: row.comment } : {}),
    ...(row.deletedAt != null ? { deletedAt: row.deletedAt } : {}),
  };
}

export class PrismaDealRepository implements DealRepository {
  async findById(id: DealId): Promise<Deal | null> {
    const row = await prisma.deal.findUnique({ where: { id } });
    return row ? toDeal(row) : null;
  }

  async list(filter?: DealListFilter): Promise<readonly Deal[]> {
    // Soft-deleted processes (deletedAt != null) are excluded from all lists/boards/
    // analytics (#397 item 23). The record and its history remain in the DB.
    const rows = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        ...(filter?.responsibleManagerId !== undefined
          ? { responsibleManagerId: filter.responsibleManagerId }
          : {}),
      },
    });
    return rows.map(toDeal);
  }

  async save(deal: Deal): Promise<void> {
    await prisma.deal.upsert({
      where: { id: deal.id },
      create: {
        id: deal.id,
        clientId: deal.clientId,
        title: deal.title,
        stage: deal.stage,
        responsibleManagerId: deal.responsibleManagerId,
        goal: deal.goal ?? null,
        type: deal.type ?? null,
        outcome: deal.outcome ?? null,
        comment: deal.comment ?? null,
        deletedAt: deal.deletedAt ?? null,
      },
      update: {
        title: deal.title,
        stage: deal.stage,
        responsibleManagerId: deal.responsibleManagerId,
        goal: deal.goal ?? null,
        type: deal.type ?? null,
        outcome: deal.outcome ?? null,
        comment: deal.comment ?? null,
        deletedAt: deal.deletedAt ?? null,
      },
    });
  }

  async delete(id: DealId): Promise<void> {
    await prisma.deal.deleteMany({ where: { id } });
  }
}
