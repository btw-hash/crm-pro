import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { Activity, ActivityId, ActivityKind } from "@/domain/activity/activity";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import { prisma } from "./prisma-client";

function toActivity(row: {
  id: string;
  dealId: string | null;
  clientId: string | null;
  kind: string;
  text: string;
  author: string;
  createdAt: Date;
  dueDate: string | null;
  done: boolean;
}): Activity {
  return {
    id: row.id as ActivityId,
    dealId: row.dealId as DealId | null,
    clientId: row.clientId as ClientId | null,
    kind: row.kind as ActivityKind,
    text: row.text,
    author: row.author,
    createdAt: row.createdAt.toISOString(),
    dueDate: row.dueDate,
    done: row.done,
  };
}

export class PrismaActivityRepository implements ActivityRepository {
  async save(activity: Activity): Promise<void> {
    await prisma.activity.upsert({
      where: { id: activity.id },
      create: {
        id: activity.id,
        dealId: activity.dealId,
        clientId: activity.clientId,
        kind: activity.kind,
        text: activity.text,
        author: activity.author,
        createdAt: new Date(activity.createdAt),
        dueDate: activity.dueDate,
        done: activity.done,
      },
      update: {
        done: activity.done,
        text: activity.text,
        dueDate: activity.dueDate,
      },
    });
  }

  async findById(id: ActivityId): Promise<Activity | null> {
    const row = await prisma.activity.findUnique({ where: { id } });
    return row ? toActivity(row) : null;
  }

  async listByDeal(dealId: DealId): Promise<readonly Activity[]> {
    const rows = await prisma.activity.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toActivity);
  }

  async listByClient(clientId: ClientId): Promise<readonly Activity[]> {
    const rows = await prisma.activity.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toActivity);
  }
}
