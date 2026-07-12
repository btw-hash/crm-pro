import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { Activity } from "@/domain/activity/activity";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export type GetMyOpenTasks = (viewer: Viewer) => Promise<readonly Activity[]>;

/**
 * Open (not done) tasks on deals within the user's visibility scope — the basis
 * of the "My day" tile on Home. For a manager, the owner boundary applies (only
 * their own deals, as in listDeals); for other roles — across all deals. Source
 * of truth is the same tasks as a deal's "next step", just as a flat list for
 * sorting by urgency.
 */
export function makeGetMyOpenTasks(deps: {
  deals: DealRepository;
  activities: ActivityRepository;
}): GetMyOpenTasks {
  return async (viewer) => {
    const deals = isOwnerScoped(viewer.role)
      ? await deps.deals.list({ responsibleManagerId: viewer.id })
      : await deps.deals.list();
    const perDeal = await Promise.all(deals.map((deal) => deps.activities.listByDeal(deal.id)));
    return perDeal.flat().filter((activity) => activity.kind === "task" && !activity.done);
  };
}
