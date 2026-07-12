import { isTerminal } from "@/domain/deal/deal-stage";
import type { KanbanDeal } from "./deals-kanban";

/** Predefined funnel "views" (saved views) — quick filter tabs. */
export type SavedViewId = "all" | "mine" | "no-next-step" | "critical";

export interface SavedView {
  readonly id: SavedViewId;
  readonly label: string;
  readonly predicate: (deal: KanbanDeal) => boolean;
}

export const SAVED_VIEWS: readonly SavedView[] = [
  { id: "all", label: "All", predicate: () => true },
  {
    id: "mine",
    label: "Mine",
    predicate: (deal) => deal.isMine && !isTerminal(deal.stage),
  },
  { id: "critical", label: "Critical", predicate: (deal) => deal.health === "critical" },
  {
    id: "no-next-step",
    label: "No next step",
    predicate: (deal) => deal.needsNextStep,
  },
];

export function isSavedViewId(value: string | null | undefined): value is SavedViewId {
  return value != null && SAVED_VIEWS.some((view) => view.id === value);
}

export function applySavedView(
  deals: readonly KanbanDeal[],
  viewId: SavedViewId,
): readonly KanbanDeal[] {
  const view = SAVED_VIEWS.find((candidate) => candidate.id === viewId);
  return view ? deals.filter(view.predicate) : deals;
}
