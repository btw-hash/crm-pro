import { describe, expect, it } from "vitest";
import type { Notification } from "@/domain/notification/notification";
import { makeId } from "@/domain/shared/id";
import { InMemoryNotificationRepository } from "@/infrastructure/persistence/in-memory-notification-repository";
import { makeMarkNotificationRead } from "./mark-notification-read";

const id = makeId<"NotificationId">("n1");

function notif(recipientId: string): Notification {
  return {
    id,
    recipientId,
    message: "Test completed",
    dealId: null,
    createdAt: "2026-06-20T00:00:00Z",
    read: false,
    important: false,
  };
}

describe("markNotificationRead — recipient boundary", () => {
  it("marks the recipient's OWN notification as read", async () => {
    const repo = new InMemoryNotificationRepository([notif("user-1")]);
    await makeMarkNotificationRead({ notifications: repo })(id, "user-1");
    expect((await repo.findById(id))?.read).toBe(true);
  });

  it("does NOT mark ANOTHER user's notification (silent no-op)", async () => {
    const repo = new InMemoryNotificationRepository([notif("user-1")]);
    await makeMarkNotificationRead({ notifications: repo })(id, "user-2");
    expect((await repo.findById(id))?.read).toBe(false);
  });
});
