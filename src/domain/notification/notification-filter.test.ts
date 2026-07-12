import { describe, expect, it } from "vitest";
import type { DealId } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import {
  DEFAULT_NOTIFICATION_FILTER,
  isNotificationFilter,
  matchesNotificationFilter,
  parseNotificationFilter,
} from "./notification-filter";

type Facts = { read: boolean; dealId: DealId | null };

const deal = (id: string) => makeId<"DealId">(id);

const unreadWithDeal: Facts = { read: false, dealId: deal("deal-1") };
const readWithDeal: Facts = { read: true, dealId: deal("deal-2") };
const unreadNoDeal: Facts = { read: false, dealId: null };
const readNoDeal: Facts = { read: true, dealId: null };

describe("parseNotificationFilter", () => {
  it("passes a valid value through", () => {
    expect(parseNotificationFilter("unread")).toBe("unread");
    expect(parseNotificationFilter("system")).toBe("system");
    expect(parseNotificationFilter("deals")).toBe("deals");
    expect(parseNotificationFilter("all")).toBe("all");
  });

  it("unknown/empty → default filter", () => {
    expect(parseNotificationFilter("bogus")).toBe(DEFAULT_NOTIFICATION_FILTER);
    expect(parseNotificationFilter(undefined)).toBe(DEFAULT_NOTIFICATION_FILTER);
    expect(parseNotificationFilter(42)).toBe(DEFAULT_NOTIFICATION_FILTER);
  });
});

describe("isNotificationFilter", () => {
  it("recognizes valid values and rejects the rest", () => {
    expect(isNotificationFilter("deals")).toBe(true);
    expect(isNotificationFilter("nope")).toBe(false);
    expect(isNotificationFilter(null)).toBe(false);
  });
});

describe("matchesNotificationFilter", () => {
  it("all passes everything", () => {
    expect(matchesNotificationFilter("all", unreadWithDeal)).toBe(true);
    expect(matchesNotificationFilter("all", readNoDeal)).toBe(true);
  });

  it("unread — only unread ones", () => {
    expect(matchesNotificationFilter("unread", unreadWithDeal)).toBe(true);
    expect(matchesNotificationFilter("unread", unreadNoDeal)).toBe(true);
    expect(matchesNotificationFilter("unread", readWithDeal)).toBe(false);
  });

  it("deals — only ones tied to a deal", () => {
    expect(matchesNotificationFilter("deals", unreadWithDeal)).toBe(true);
    expect(matchesNotificationFilter("deals", readWithDeal)).toBe(true);
    expect(matchesNotificationFilter("deals", unreadNoDeal)).toBe(false);
    expect(matchesNotificationFilter("deals", readNoDeal)).toBe(false);
  });

  it("system — only ones not tied to a deal", () => {
    expect(matchesNotificationFilter("system", unreadNoDeal)).toBe(true);
    expect(matchesNotificationFilter("system", readNoDeal)).toBe(true);
    expect(matchesNotificationFilter("system", unreadWithDeal)).toBe(false);
    expect(matchesNotificationFilter("system", readWithDeal)).toBe(false);
  });
});
