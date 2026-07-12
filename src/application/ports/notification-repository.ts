import type { Notification, NotificationId } from "@/domain/notification/notification";

export interface NotificationRepository {
  save(notification: Notification): Promise<void>;
  findById(id: NotificationId): Promise<Notification | null>;
  /** Notifications for a recipient, newest first. */
  listForRecipient(recipientId: string): Promise<readonly Notification[]>;
  /** Number of unread notifications for a recipient. */
  countUnread(recipientId: string): Promise<number>;
}
