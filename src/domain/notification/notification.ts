import type { DealId } from "@/domain/deal/deal";
import type { Id } from "@/domain/shared/id";

export type NotificationId = Id<"NotificationId">;

/** Informs the user about an event (passive capture: this is a message, not data entry). */
export interface Notification {
  readonly id: NotificationId;
  /** Recipient — user id (Manager or Technologist); same type as Deal.responsibleManagerId. */
  readonly recipientId: string;
  readonly message: string;
  readonly dealId: DealId | null;
  readonly createdAt: string; // ISO
  readonly read: boolean;
  /**
   * Importance — a dimension independent of read-state (design §5.1). Important
   * notifications get a red "important" mark ON TOP OF the amber "new" mark. Not to
   * be confused with novelty: red = importance, amber = novelty.
   */
  readonly important: boolean;
}

export class NotificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotificationValidationError";
  }
}

export interface CreateNotificationInput {
  readonly id: NotificationId;
  readonly recipientId: string;
  readonly message: string;
  readonly dealId?: DealId | null;
  readonly createdAt: string;
  readonly important?: boolean;
}

export function createNotification(input: CreateNotificationInput): Notification {
  if (input.recipientId.trim() === "") {
    throw new NotificationValidationError("Notification recipient is not set");
  }
  if (input.message.trim() === "") {
    throw new NotificationValidationError("Notification text is empty");
  }
  return {
    id: input.id,
    recipientId: input.recipientId,
    message: input.message.trim(),
    dealId: input.dealId ?? null,
    createdAt: input.createdAt,
    read: false,
    important: input.important ?? false,
  };
}

/** Immutably marks as read; a repeat call is a no-op (returns the same object). */
export function markAsRead(notification: Notification): Notification {
  return notification.read ? notification : { ...notification, read: true };
}
