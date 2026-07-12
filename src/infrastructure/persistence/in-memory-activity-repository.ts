import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ClientId } from "@/domain/client/client";
import type { Activity, ActivityId } from "@/domain/activity/activity";
import type { DealId } from "@/domain/deal/deal";

export class InMemoryActivityRepository implements ActivityRepository {
  private readonly activities = new Map<ActivityId, Activity>();

  constructor(seed: readonly Activity[] = []) {
    for (const activity of seed) {
      this.activities.set(activity.id, activity);
    }
  }

  async save(activity: Activity): Promise<void> {
    this.activities.set(activity.id, activity);
  }

  async findById(id: ActivityId): Promise<Activity | null> {
    return this.activities.get(id) ?? null;
  }

  async listByDeal(dealId: DealId): Promise<readonly Activity[]> {
    return this.sortedNewestFirst((a) => a.dealId === dealId);
  }

  async listByClient(clientId: ClientId): Promise<readonly Activity[]> {
    return this.sortedNewestFirst((a) => a.clientId === clientId);
  }

  private sortedNewestFirst(predicate: (a: Activity) => boolean): readonly Activity[] {
    return [...this.activities.values()]
      .filter(predicate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
