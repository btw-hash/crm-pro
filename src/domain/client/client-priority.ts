import type { ClientCategory } from "./client-category";

/** Client priority (no scoring — derived from the ABC category; predictive scoring is Phase 2). */
export const CLIENT_PRIORITIES = ["high", "medium", "low"] as const;

export type ClientPriority = (typeof CLIENT_PRIORITIES)[number];

export const CLIENT_PRIORITY_LABELS: Record<ClientPriority, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

/** ABC category → priority: A — high, B — medium, C — low. */
export function clientPriority(category: ClientCategory): ClientPriority {
  switch (category) {
    case "A":
      return "high";
    case "B":
      return "medium";
    case "C":
      return "low";
  }
}
