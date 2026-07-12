import { describe, expect, it } from "vitest";
import type { Activity } from "@/domain/activity/activity";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import type { Viewer } from "@/domain/shared/viewer";
import { createDealEvent } from "@/domain/deal-event/deal-event";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { makeListDealsWithStatus } from "./list-deals-with-status";

const dealA: Deal = {
  id: makeId<"DealId">("d1"),
  clientId: makeId<"ClientId">("c1") as ClientId,
  title: "Deal A",
  stage: "audit",
  responsibleManagerId: "m1",
};
const dealB: Deal = {
  id: makeId<"DealId">("d2"),
  clientId: makeId<"ClientId">("c2") as ClientId,
  title: "Deal B",
  stage: "qualification",
  responsibleManagerId: "m1",
};

const openTaskForA: Activity = {
  id: makeId<"ActivityId">("a1"),
  dealId: dealA.id,
  clientId: null,
  kind: "task",
  text: "Call back",
  author: "m1",
  createdAt: "2026-06-22T10:00:00.000Z",
  dueDate: "2026-06-25",
  done: false,
};

const mop = (id: string): Viewer => ({ id, role: "mop" });
const NOW = "2026-06-26T00:00:00.000Z"; // fixed timestamp for determinism

describe("listDealsWithStatus", () => {
  it("marks a deal with no open tasks as needing a next step", async () => {
    const listDealsWithStatus = makeListDealsWithStatus({
      deals: new InMemoryDealRepository([dealA, dealB]),
      activities: new InMemoryActivityRepository([openTaskForA]),
      events: new InMemoryDealEventRepository([]),
    });

    const result = await listDealsWithStatus(mop("m1"));
    const byId = new Map(result.map((item) => [item.deal.id, item.needsNextStep]));

    expect(byId.get(dealA.id)).toBe(false); // has an open task
    expect(byId.get(dealB.id)).toBe(true); // no tasks
  });

  it("with no stage events, daysOnStage = null and it is not stale", async () => {
    const listDealsWithStatus = makeListDealsWithStatus({
      deals: new InMemoryDealRepository([dealA]),
      activities: new InMemoryActivityRepository([]),
      events: new InMemoryDealEventRepository([]),
    });
    const [item] = await listDealsWithStatus(mop("m1"));
    expect(item?.daysOnStage).toBeNull();
    expect(item?.stale).toBe(false);
  });

  it("an old stage-change event → the deal is stale, with a day count", async () => {
    const oldEvent = createDealEvent({
      id: makeId<"DealEventId">("ev-1"),
      dealId: dealA.id,
      type: "stage_changed",
      summary: "Qualification → Audit",
      actor: "m1",
      createdAt: "2026-06-01T00:00:00.000Z", // 25 days before the fixed NOW → above threshold
      fromStage: "qualification",
      toStage: "audit",
    });
    const listDealsWithStatus = makeListDealsWithStatus({
      deals: new InMemoryDealRepository([dealA]),
      activities: new InMemoryActivityRepository([]),
      events: new InMemoryDealEventRepository([oldEvent]),
      now: () => NOW,
    });
    const [item] = await listDealsWithStatus(mop("m1"));
    expect(item?.daysOnStage).toBe(25);
    expect(item?.stale).toBe(true); // >= 14 days
  });

  it("preserves the sales manager's visibility (own deals only)", async () => {
    const foreign: Deal = { ...dealB, id: makeId<"DealId">("d3"), responsibleManagerId: "m2" };
    const listDealsWithStatus = makeListDealsWithStatus({
      deals: new InMemoryDealRepository([dealA, foreign]),
      activities: new InMemoryActivityRepository([]),
      events: new InMemoryDealEventRepository([]),
    });

    const result = await listDealsWithStatus(mop("m1"));

    expect(result).toHaveLength(1);
    expect(result[0]?.deal.id).toBe(dealA.id);
  });
});
