import type { NotificationRepository } from "@/application/ports/notification-repository";
import type { Notifier, NotifyInput } from "@/application/ports/notifier";
import { createNotification } from "@/domain/notification/notification";
import { makeId } from "@/domain/shared/id";
import type { Logger } from "@/infrastructure/logging/logger";

/**
 * Notification delivery stub: stores the notification in the repository (UI feed)
 * and logs the delivery fact. The log only carries recipient and deal ids —
 * no message text, PII, or trade secrets. Real channels sit behind the same port (#21).
 */
export class StubNotifier implements Notifier {
  constructor(
    private readonly notifications: NotificationRepository,
    private readonly logger: Logger,
  ) {}

  async notify(input: NotifyInput): Promise<void> {
    const notification = createNotification({
      id: makeId<"NotificationId">(crypto.randomUUID()),
      recipientId: input.recipientId,
      message: input.message,
      dealId: input.dealId ?? null,
      createdAt: new Date().toISOString(),
    });
    await this.notifications.save(notification);
    this.logger.info("notification.delivered", {
      recipientId: input.recipientId,
      dealId: input.dealId ?? null,
    });
  }
}
