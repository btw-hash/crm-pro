import type { NotificationRepository } from "@/application/ports/notification-repository";
import type { Notification, NotificationId } from "@/domain/notification/notification";
import type { DealId } from "@/domain/deal/deal";
import { prisma } from "./prisma-client";

function toNotification(row: {
  id: string;
  recipientId: string;
  message: string;
  dealId: string | null;
  createdAt: Date;
  read: boolean;
  important: boolean;
}): Notification {
  return {
    id: row.id as NotificationId,
    recipientId: row.recipientId,
    message: row.message,
    dealId: row.dealId as DealId | null,
    createdAt: row.createdAt.toISOString(),
    read: row.read,
    important: row.important,
  };
}

export class PrismaNotificationRepository implements NotificationRepository {
  async save(notification: Notification): Promise<void> {
    await prisma.notification.upsert({
      where: { id: notification.id },
      create: {
        id: notification.id,
        recipientId: notification.recipientId,
        message: notification.message,
        dealId: notification.dealId,
        createdAt: new Date(notification.createdAt),
        read: notification.read,
        important: notification.important,
      },
      update: {
        read: notification.read,
        message: notification.message,
        important: notification.important,
      },
    });
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    const row = await prisma.notification.findUnique({ where: { id } });
    return row ? toNotification(row) : null;
  }

  async listForRecipient(recipientId: string): Promise<readonly Notification[]> {
    const rows = await prisma.notification.findMany({
      where: { recipientId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toNotification);
  }

  async countUnread(recipientId: string): Promise<number> {
    return prisma.notification.count({
      where: { recipientId, read: false },
    });
  }
}
