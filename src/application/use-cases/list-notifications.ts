import type { NotificationRepository } from "@/application/ports/notification-repository";
import type { Notification } from "@/domain/notification/notification";

export type ListNotifications = (recipientId: string) => Promise<readonly Notification[]>;

export function makeListNotifications(deps: {
  notifications: NotificationRepository;
}): ListNotifications {
  return (recipientId) => deps.notifications.listForRecipient(recipientId);
}
