import type { ActivityRepository } from "@/application/ports/activity-repository";
import { type Activity, type ActivityId, markDone } from "@/domain/activity/activity";

export class ActivityNotFoundError extends Error {
  constructor(readonly id: ActivityId) {
    super(`Activity not found: ${id}`);
    this.name = "ActivityNotFoundError";
  }
}

export class NotATaskError extends Error {
  constructor(readonly id: ActivityId) {
    super(`Activity is not a task: ${id}`);
    this.name = "NotATaskError";
  }
}

export type CompleteTask = (id: ActivityId) => Promise<Activity>;

/** Marks a task as done. */
export function makeCompleteTask(deps: { activities: ActivityRepository }): CompleteTask {
  return async function completeTask(id) {
    const activity = await deps.activities.findById(id);
    if (!activity) {
      throw new ActivityNotFoundError(id);
    }
    if (activity.kind !== "task") {
      throw new NotATaskError(id);
    }
    const done = markDone(activity);
    await deps.activities.save(done);
    return done;
  };
}
