import type { DealRepository } from "@/application/ports/deal-repository";
import type { Deal } from "@/domain/deal/deal";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export type ListDeals = (viewer: Viewer) => Promise<readonly Deal[]>;

/**
 * List of deals with visibility rules applied: a sales manager sees only their own
 * deals, a technologist sees the shared queue (all deals). Owner filtering happens
 * at the use-case level — other people's records never make it into the response.
 */
export function makeListDeals(deps: { deals: DealRepository }): ListDeals {
  return (viewer) => {
    if (isOwnerScoped(viewer.role)) {
      return deps.deals.list({ responsibleManagerId: viewer.id });
    }
    return deps.deals.list();
  };
}
