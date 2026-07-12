import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { DealEventRepository } from "@/application/ports/deal-event-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import {
  type DealHealth,
  dealHealth,
  dealNeedsNextStep,
  daysOnStage,
  isStaleOnStage,
} from "@/domain/deal/deal-attention";
import type { Deal } from "@/domain/deal/deal";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export interface DealWithStatus {
  readonly deal: Deal;
  /** Deal in an active stage with no next step scheduled ("stuck"). */
  readonly needsNextStep: boolean;
  /** Days on the current stage (based on events); null — no transitions yet. */
  readonly daysOnStage: number | null;
  /** Stuck on the stage too long (>= threshold) — a discipline signal. */
  readonly stale: boolean;
  /** Deal health as a single signal (for the Score Pill on the board). */
  readonly health: DealHealth;
}

export type ListDealsWithStatus = (viewer: Viewer) => Promise<readonly DealWithStatus[]>;

/**
 * List of deals with visibility rules applied (like `listDeals`: sales manager — own,
 * technologist — the shared queue) plus, for each one, a "no next step" flag and "how
 * long it has been on this stage" — to highlight stuck deals in the pipeline.
 */
export function makeListDealsWithStatus(deps: {
  deals: DealRepository;
  activities: ActivityRepository;
  events: DealEventRepository;
  /** Current time (ISO) — injected for determinism/tests (as in get-home-dashboard). */
  now?: () => string;
}): ListDealsWithStatus {
  const nowIso = deps.now ?? (() => new Date().toISOString());
  return async (viewer) => {
    const now = nowIso();
    const deals = isOwnerScoped(viewer.role)
      ? await deps.deals.list({ responsibleManagerId: viewer.id })
      : await deps.deals.list();
    return Promise.all(
      deals.map(async (deal) => {
        const [activities, events] = await Promise.all([
          deps.activities.listByDeal(deal.id),
          deps.events.listByDeal(deal.id),
        ]);
        const days = daysOnStage(events, now);
        const needsNextStep = dealNeedsNextStep(deal, activities);
        return {
          deal,
          needsNextStep,
          daysOnStage: days,
          stale: isStaleOnStage(deal, days),
          health: dealHealth(deal, needsNextStep, days),
        };
      }),
    );
  };
}
