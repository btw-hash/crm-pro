import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { createNotification, markAsRead, NotificationValidationError } from "./notification";

const base = {
  id: makeId<"NotificationId">("n1"),
  recipientId: "manager-owens",
  message: "Test recorded",
  createdAt: "2026-06-21T00:00:00Z",
};

describe("notification", () => {
  it("is created unread, trims the text, dealId defaults to null", () => {
    const n = createNotification({ ...base, message: "  Test recorded  " });
    expect(n.read).toBe(false);
    expect(n.message).toBe("Test recorded");
    expect(n.dealId).toBeNull();
  });

  it("rejects empty text and an empty recipient", () => {
    expect(() => createNotification({ ...base, message: "  " })).toThrow(
      NotificationValidationError,
    );
    expect(() => createNotification({ ...base, recipientId: "" })).toThrow(
      NotificationValidationError,
    );
  });

  it("markAsRead is immutable and idempotent", () => {
    const n = createNotification(base);
    const read = markAsRead(n);
    expect(read.read).toBe(true);
    expect(n.read).toBe(false); // original not mutated
    expect(markAsRead(read)).toBe(read); // repeat call — same object
  });
});
