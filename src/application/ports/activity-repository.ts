import type { ClientId } from "@/domain/client/client";
import type { Activity, ActivityId } from "@/domain/activity/activity";
import type { DealId } from "@/domain/deal/deal";

export interface ActivityRepository {
  save(activity: Activity): Promise<void>;
  findById(id: ActivityId): Promise<Activity | null>;
  /** Activities for a deal, newest first. */
  listByDeal(dealId: DealId): Promise<readonly Activity[]>;
  /** Activities for a client, newest first. */
  listByClient(clientId: ClientId): Promise<readonly Activity[]>;
}
