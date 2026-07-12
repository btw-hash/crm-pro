import type { NotificationRepository } from "@/application/ports/notification-repository";

export type CountUnreadNotifications = (recipientId: string) => Promise<number>;

export function makeCountUnreadNotifications(deps: {
  notifications: NotificationRepository;
}): CountUnreadNotifications {
  return (recipientId) => deps.notifications.countUnread(recipientId);
}
