import type { ClientCategory } from "./client-category";
import { clientPriority } from "./client-priority";

/**
 * Segment filter for the client list (the "All/Key/Debtors/New" pills).
 *
 * `all` — no filtering (default). The other segments reuse exactly the same
 * signals the page counters are computed from:
 * - `key` — high priority (ABC category A);
 * - `debtors` — over the credit limit (AR balance from the ERP, `isOverLimit`);
 * - `new` — the client has no deals yet.
 *
 * Single source of truth for filtering/counters; the same predicate will be
 * reused on the operational screens (see #321).
 */
export const CLIENT_FILTERS = ["all", "key", "debtors", "new"] as const;

export type ClientFilter = (typeof CLIENT_FILTERS)[number];

/** Default filter — show everyone. */
export const DEFAULT_CLIENT_FILTER: ClientFilter = "all";

/** Pill labels (order = display order). */
export const CLIENT_FILTER_LABELS: Record<ClientFilter, string> = {
  all: "All",
  key: "Key",
  debtors: "Debtors",
  new: "New",
};

/**
 * Client signals the filter operates on. Deliberately decoupled from
 * specific sources (ERP balance, deal count) — assembled at the presentation
 * layer and passed in here, so the predicate stays pure and reusable
 * (including on the operational screens).
 */
export interface ClientFilterFacts {
  readonly category: ClientCategory;
  /** Over the credit limit (debt > limit). No balance → false. */
  readonly isOverLimit: boolean;
  /** Number of the client's deals. 0 → "new". */
  readonly dealCount: number;
}

/** Type guard: recognizes a valid filter identifier (for parsing the `?filter=` URL param). */
export function isClientFilter(value: unknown): value is ClientFilter {
  return typeof value === "string" && (CLIENT_FILTERS as readonly string[]).includes(value);
}

/**
 * Parses the `?filter=` URL param value into a filter. An unknown/empty value →
 * the default filter ("All"), so a broken link doesn't break the screen.
 */
export function parseClientFilter(value: unknown): ClientFilter {
  return isClientFilter(value) ? value : DEFAULT_CLIENT_FILTER;
}

/** Does the client match the filter. `all` passes everyone. */
export function matchesClientFilter(filter: ClientFilter, facts: ClientFilterFacts): boolean {
  switch (filter) {
    case "all":
      return true;
    case "key":
      return clientPriority(facts.category) === "high";
    case "debtors":
      return facts.isOverLimit;
    case "new":
      return facts.dealCount === 0;
  }
}
