/**
 * Explicit goal of the deal/visit (Puratos discipline: go with a goal, not just
 * "to chat"). Light segmentation without prediction or scoring — that's Phase 2.
 */
export const DEAL_GOALS = [
  "order",
  "new_sku",
  "collect_receivables",
  "test",
  "win_back",
  "other",
] as const;

export type DealGoal = (typeof DEAL_GOALS)[number];

export const DEAL_GOAL_LABELS: Record<DealGoal, string> = {
  order: "Order",
  new_sku: "New SKU introduction",
  collect_receivables: "Collect receivables",
  test: "Test / trial run",
  win_back: "Win back client",
  other: "Other",
};

export const DEFAULT_DEAL_GOAL: DealGoal = "other";

export function isDealGoal(value: string): value is DealGoal {
  return (DEAL_GOALS as readonly string[]).includes(value);
}
