import type { Onboarding, OnboardingStatus } from "./onboarding";

/**
 * Onboarding list filter (chips "All/Collecting/With legal/Approved/Needs rework").
 *
 * `all` — no filtering (default). The rest narrow strictly by status:
 * - `collecting` — collecting documents;
 * - `legal_review` — with legal counsel for review;
 * - `approved` — approved;
 * - `rejected` — sent back for rework.
 *
 * A pure predicate — a single source of truth for both the chips and the list filtering.
 */
export const ONBOARDING_FILTERS = [
  "all",
  "collecting",
  "legal_review",
  "approved",
  "rejected",
] as const;

export type OnboardingFilter = (typeof ONBOARDING_FILTERS)[number];

/** Default filter — show all. */
export const DEFAULT_ONBOARDING_FILTER: OnboardingFilter = "all";

/** Chip labels (order = display order, per the design reference). */
export const ONBOARDING_FILTER_LABELS: Record<OnboardingFilter, string> = {
  all: "All",
  collecting: "Collecting",
  legal_review: "With legal",
  approved: "Approved",
  rejected: "Needs rework",
};

/** Type guard: recognizes a valid filter identifier (for parsing the URL `?filter=`). */
export function isOnboardingFilter(value: unknown): value is OnboardingFilter {
  return typeof value === "string" && (ONBOARDING_FILTERS as readonly string[]).includes(value);
}

/**
 * Parses the `?filter=` URL parameter value into a filter. An
 * unknown/empty value → the default filter ("All").
 */
export function parseOnboardingFilter(value: unknown): OnboardingFilter {
  return isOnboardingFilter(value) ? value : DEFAULT_ONBOARDING_FILTER;
}

/** Maps a filter chip to a specific onboarding status (except `all`). */
const FILTER_STATUS: Record<Exclude<OnboardingFilter, "all">, OnboardingStatus> = {
  collecting: "collecting",
  legal_review: "legal_review",
  approved: "approved",
  rejected: "rejected",
};

/** Whether the onboarding matches the filter. `all` passes everything. */
export function matchesOnboardingFilter(
  filter: OnboardingFilter,
  onboarding: Pick<Onboarding, "status">,
): boolean {
  if (filter === "all") return true;
  return onboarding.status === FILTER_STATUS[filter];
}
