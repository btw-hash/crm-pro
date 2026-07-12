import type { NotificationRepository } from "@/application/ports/notification-repository";
import { markAsRead, type NotificationId } from "@/domain/notification/notification";

export type MarkNotificationRead = (id: NotificationId, recipientId: string) => Promise<void>;

/**
 * Marks a notification as read — only the recipient's own. `recipientId` (the current
 * user) is checked against the addressee: another user's notification cannot be marked
 * (silent no-op), otherwise anyone could hide a colleague's alert with a direct POST
 * bypassing the UI.
 */
export function makeMarkNotificationRead(deps: {
  notifications: NotificationRepository;
}): MarkNotificationRead {
  return async function markNotificationRead(id, recipientId) {
    const notification = await deps.notifications.findById(id);
    if (!notification || notification.recipientId !== recipientId) {
      return; // no such notification, or it belongs to someone else — quietly exit
    }
    await deps.notifications.save(markAsRead(notification));
  };
}
