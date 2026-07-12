import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { type Deal, DealStageTransitionError } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";
import type { NotifyInput } from "@/application/ports/notifier";
import { makeId } from "@/domain/shared/id";
import { ActivityFollowUpTaskCreator } from "@/infrastructure/persistence/activity-follow-up-task-creator";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { StoringDealEventRecorder } from "@/infrastructure/persistence/storing-deal-event-recorder";
import { DealNotFoundError, makeAdvanceDealStage } from "./advance-deal-stage";

function repoWithDealAt(stage: DealStage): InMemoryDealRepository {
  const deal: Deal = {
    id: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage,
    responsibleManagerId: "m1",
  };
  return new InMemoryDealRepository([deal]);
}

function setup(stage: DealStage) {
  const deals = repoWithDealAt(stage);
  const events = new InMemoryDealEventRepository();
  const activities = new InMemoryActivityRepository();
  const sent: NotifyInput[] = [];
  const advance = makeAdvanceDealStage({
    deals,
    events: new StoringDealEventRecorder(events),
    tasks: new ActivityFollowUpTaskCreator(activities),
    notifier: {
      notify: async (input: NotifyInput) => {
        sent.push(input);
      },
    },
  });
  return { deals, events, activities, sent, advance };
}

describe("advanceDealStage", () => {
  it("saves the deal at the new stage", async () => {
    const { deals, advance } = setup("qualification");

    const updated = await advance({ dealId: makeId<"DealId">("d1"), to: "audit", actor: "m1" });

    expect(updated.stage).toBe("audit");
    expect((await deals.findById(makeId<"DealId">("d1")))?.stage).toBe("audit");
  });

  it("records the stage-change event in the log", async () => {
    const { events, advance } = setup("qualification");

    await advance({ dealId: makeId<"DealId">("d1"), to: "audit", actor: "m1" });

    const recorded = await events.listByDeal(makeId<"DealId">("d1"));
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.type).toBe("stage_changed");
    expect(recorded[0]?.fromStage).toBe("qualification");
    expect(recorded[0]?.toStage).toBe("audit");
    expect(recorded[0]?.actor).toBe("m1");
  });

  it("throws DealNotFoundError for a missing deal", async () => {
    const { advance } = setup("audit");
    await expect(
      advance({ dealId: makeId<"DealId">("missing"), to: "quote", actor: "m1" }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });

  it("propagates the domain error for an invalid transition", async () => {
    const { advance } = setup("qualification");
    await expect(
      advance({ dealId: makeId<"DealId">("d1"), to: "testing", actor: "m1" }),
    ).rejects.toBeInstanceOf(DealStageTransitionError);
  });

  it("moving to quote creates an auto-task for the manager and notifies them (trigger)", async () => {
    const { advance, activities, sent } = setup("audit");

    await advance({ dealId: makeId<"DealId">("d1"), to: "quote", actor: "m1" });

    const tasks = await activities.listByDeal(makeId<"DealId">("d1"));
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.kind).toBe("task");
    expect(tasks[0]?.text).toContain("Proposal");
    expect(tasks[0]?.author).toBe("m1"); // the deal's responsible manager
    expect(sent).toHaveLength(1);
    expect(sent[0]?.recipientId).toBe("m1");
  });

  it("no auto-task is created for a stage without a trigger", async () => {
    const { advance, activities, sent } = setup("qualification");

    await advance({ dealId: makeId<"DealId">("d1"), to: "audit", actor: "m1" });

    expect(await activities.listByDeal(makeId<"DealId">("d1"))).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });
});
