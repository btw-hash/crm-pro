import type { Notification } from "./notification";

/**
 * Notification list filter (chips "All/Unread/Deals/System", design §5.1).
 *
 * `all` — no filtering (default). The rest:
 * - `unread` — unread (`read === false`);
 * - `deals` — deal-related, tied to a deal (`dealId !== null`);
 * - `system` — system, not tied to a deal (`dealId === null`):
 *   quotas, summaries, approvals, onboarding.
 *
 * A pure predicate — a single source of truth for both the chip counters and
 * the actual list filtering (no count↔output desync), same approach as
 * client-filter.
 */
export const NOTIFICATION_FILTERS = ["all", "unread", "deals", "system"] as const;

export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];

/** Default filter — show all. */
export const DEFAULT_NOTIFICATION_FILTER: NotificationFilter = "all";

/** Chip labels (order = display order). */
export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilter, string> = {
  all: "All",
  unread: "Unread",
  deals: "Deals",
  system: "System",
};

/** Type guard: recognizes a valid filter identifier (for parsing the URL `?filter=`). */
export function isNotificationFilter(value: unknown): value is NotificationFilter {
  return typeof value === "string" && (NOTIFICATION_FILTERS as readonly string[]).includes(value);
}

/**
 * Parses the `?filter=` URL parameter value into a filter. An
 * unknown/empty value → the default filter ("All"), so a bad link doesn't
 * break the screen.
 */
export function parseNotificationFilter(value: unknown): NotificationFilter {
  return isNotificationFilter(value) ? value : DEFAULT_NOTIFICATION_FILTER;
}

/** Whether the notification matches the filter. `all` passes everything. */
export function matchesNotificationFilter(
  filter: NotificationFilter,
  notification: Pick<Notification, "read" | "dealId">,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unread":
      return !notification.read;
    case "deals":
      return notification.dealId !== null;
    case "system":
      return notification.dealId === null;
  }
}
