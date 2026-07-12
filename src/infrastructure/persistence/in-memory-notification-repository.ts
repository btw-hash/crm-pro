import type { NotificationRepository } from "@/application/ports/notification-repository";
import type { Notification, NotificationId } from "@/domain/notification/notification";

export class InMemoryNotificationRepository implements NotificationRepository {
  private readonly items = new Map<NotificationId, Notification>();

  constructor(seed: readonly Notification[] = []) {
    for (const notification of seed) {
      this.items.set(notification.id, notification);
    }
  }

  async save(notification: Notification): Promise<void> {
    this.items.set(notification.id, notification);
  }

  async findById(id: NotificationId): Promise<Notification | null> {
    return this.items.get(id) ?? null;
  }

  async listForRecipient(recipientId: string): Promise<readonly Notification[]> {
    return [...this.items.values()]
      .filter((n) => n.recipientId === recipientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async countUnread(recipientId: string): Promise<number> {
    return [...this.items.values()].filter((n) => n.recipientId === recipientId && !n.read).length;
  }
}
