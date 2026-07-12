import type { ActivityRepository } from "@/application/ports/activity-repository";
import type {
  CreateFollowUpTaskInput,
  FollowUpTaskCreator,
} from "@/application/ports/follow-up-task-creator";
import { createActivity } from "@/domain/activity/activity";
import { makeId } from "@/domain/shared/id";

const DAY_MS = 86_400_000;

/**
 * Creates an auto task as an Activity. Id/time/due date are set here (infra),
 * like `StoringDealEventRecorder` — so use-cases stay pure.
 */
export class ActivityFollowUpTaskCreator implements FollowUpTaskCreator {
  constructor(private readonly activities: ActivityRepository) {}

  async create(input: CreateFollowUpTaskInput): Promise<void> {
    const now = new Date();
    const due = new Date(now.getTime() + input.dueInDays * DAY_MS);
    const activity = createActivity({
      id: makeId<"ActivityId">(crypto.randomUUID()),
      dealId: input.dealId,
      kind: "task",
      text: input.text,
      author: input.assignee,
      createdAt: now.toISOString(),
      dueDate: due.toISOString().slice(0, 10),
    });
    await this.activities.save(activity);
  }
}
