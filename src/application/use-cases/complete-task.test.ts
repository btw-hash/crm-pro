import { describe, expect, it } from "vitest";
import { createActivity } from "@/domain/activity/activity";
import { makeId } from "@/domain/shared/id";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { ActivityNotFoundError, makeCompleteTask, NotATaskError } from "./complete-task";

const dealId = makeId<"DealId">("d1");

function task() {
  return createActivity({
    id: makeId<"ActivityId">("t1"),
    dealId,
    kind: "task",
    text: "Call about the test results",
    author: "manager-owens",
    createdAt: "2026-06-21T10:00:00Z",
    dueDate: "2026-06-25",
  });
}

describe("completeTask", () => {
  it("marks a task as done", async () => {
    const activities = new InMemoryActivityRepository([task()]);
    const completeTask = makeCompleteTask({ activities });

    const done = await completeTask(makeId<"ActivityId">("t1"));

    expect(done.done).toBe(true);
    expect((await activities.findById(makeId<"ActivityId">("t1")))?.done).toBe(true);
  });

  it("throws ActivityNotFoundError for an unknown id", async () => {
    const completeTask = makeCompleteTask({ activities: new InMemoryActivityRepository() });
    await expect(completeTask(makeId<"ActivityId">("missing"))).rejects.toBeInstanceOf(
      ActivityNotFoundError,
    );
  });

  it("throws NotATaskError if the activity is not a task", async () => {
    const note = createActivity({
      id: makeId<"ActivityId">("n1"),
      dealId,
      kind: "note",
      text: "Just a note",
      author: "manager-owens",
      createdAt: "2026-06-21T10:00:00Z",
    });
    const completeTask = makeCompleteTask({
      activities: new InMemoryActivityRepository([note]),
    });
    await expect(completeTask(makeId<"ActivityId">("n1"))).rejects.toBeInstanceOf(NotATaskError);
  });
});
