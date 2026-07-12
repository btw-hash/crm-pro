import type { ActivityRepository } from "@/application/ports/activity-repository";
import {
  type Activity,
  type CreateActivityInput,
  createActivity,
} from "@/domain/activity/activity";

export type RecordActivity = (input: CreateActivityInput) => Promise<Activity>;

/** Saves an activity (note/call/visit/task) against a deal or client. */
export function makeRecordActivity(deps: { activities: ActivityRepository }): RecordActivity {
  return async function recordActivity(input) {
    const activity = createActivity(input);
    await deps.activities.save(activity);
    return activity;
  };
}
