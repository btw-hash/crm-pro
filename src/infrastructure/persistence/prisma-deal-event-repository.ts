import type { DealEventRepository } from "@/application/ports/deal-event-repository";
import type { DealEvent, DealEventId, DealEventType } from "@/domain/deal-event/deal-event";
import type { DealId } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";
import { prisma } from "./prisma-client";

function toDealEvent(row: {
  id: string;
  dealId: string;
  type: string;
  summary: string;
  actor: string;
  createdAt: Date;
  fromStage: string | null;
  toStage: string | null;
}): DealEvent {
  return {
    id: row.id as DealEventId,
    dealId: row.dealId as DealId,
    type: row.type as DealEventType,
    summary: row.summary,
    actor: row.actor,
    createdAt: row.createdAt.toISOString(),
    fromStage: row.fromStage as DealStage | null,
    toStage: row.toStage as DealStage | null,
  };
}

export class PrismaDealEventRepository implements DealEventRepository {
  async save(event: DealEvent): Promise<void> {
    await prisma.dealEvent.upsert({
      where: { id: event.id },
      create: {
        id: event.id,
        dealId: event.dealId,
        type: event.type,
        summary: event.summary,
        actor: event.actor,
        createdAt: new Date(event.createdAt),
        fromStage: event.fromStage,
        toStage: event.toStage,
      },
      update: {
        summary: event.summary,
        fromStage: event.fromStage,
        toStage: event.toStage,
      },
    });
  }

  async listByDeal(dealId: DealId): Promise<readonly DealEvent[]> {
    const rows = await prisma.dealEvent.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDealEvent);
  }

  async list(): Promise<readonly DealEvent[]> {
    const rows = await prisma.dealEvent.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDealEvent);
  }
}
