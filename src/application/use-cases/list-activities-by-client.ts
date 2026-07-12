import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { Activity } from "@/domain/activity/activity";
import type { ClientId } from "@/domain/client/client";

export type ListActivitiesByClient = (clientId: ClientId) => Promise<readonly Activity[]>;

/** Client activity feed (newest first). */
export function makeListActivitiesByClient(deps: {
  activities: ActivityRepository;
}): ListActivitiesByClient {
  return (clientId) => deps.activities.listByClient(clientId);
}
