import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { type Deal, DealStageRevertError } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { StoringDealEventRecorder } from "@/infrastructure/persistence/storing-deal-event-recorder";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeRevertDealStage } from "./revert-deal-stage";

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
  const revert = makeRevertDealStage({
    deals,
    events: new StoringDealEventRecorder(events),
  });
  return { deals, events, revert };
}

describe("revertDealStage", () => {
  it("reverts a deal to an earlier stage", async () => {
    const { deals, revert } = setup("quote");

    const updated = await revert({
      dealId: makeId<"DealId">("d1"),
      toStage: "audit",
      revertedBy: "m1",
    });

    expect(updated.stage).toBe("audit");
    expect((await deals.findById(makeId<"DealId">("d1")))?.stage).toBe("audit");
  });

  it("records a stage_reverted event with a reason", async () => {
    const { events, revert } = setup("testing");

    await revert({
      dealId: makeId<"DealId">("d1"),
      toStage: "audit",
      reason: "Drag-and-drop mistake",
      revertedBy: "m1",
    });

    const recorded = await events.listByDeal(makeId<"DealId">("d1"));
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.type).toBe("stage_reverted");
    expect(recorded[0]?.fromStage).toBe("testing");
    expect(recorded[0]?.toStage).toBe("audit");
    expect(recorded[0]?.actor).toBe("m1");
    expect(recorded[0]?.summary).toContain("Drag-and-drop mistake");
  });

  it("records an event without a reason (empty reason)", async () => {
    const { events, revert } = setup("quote");

    await revert({
      dealId: makeId<"DealId">("d1"),
      toStage: "qualification",
      revertedBy: "m1",
    });

    const recorded = await events.listByDeal(makeId<"DealId">("d1"));
    expect(recorded[0]?.type).toBe("stage_reverted");
    expect(recorded[0]?.summary).not.toContain("Reason:");
  });

  it("throws DealNotFoundError for a missing deal", async () => {
    const { revert } = setup("quote");
    await expect(
      revert({ dealId: makeId<"DealId">("missing"), toStage: "audit", revertedBy: "m1" }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });

  it("throws DealStageRevertError when reverting to a terminal stage", async () => {
    const { revert } = setup("quote");
    await expect(
      revert({ dealId: makeId<"DealId">("d1"), toStage: "completed", revertedBy: "m1" }),
    ).rejects.toBeInstanceOf(DealStageRevertError);
  });

  it("throws DealStageRevertError when reverting to the same stage", async () => {
    const { revert } = setup("audit");
    await expect(
      revert({ dealId: makeId<"DealId">("d1"), toStage: "audit", revertedBy: "m1" }),
    ).rejects.toBeInstanceOf(DealStageRevertError);
  });

  it("throws DealStageRevertError when trying to move forward via revert", async () => {
    const { revert } = setup("audit");
    await expect(
      revert({ dealId: makeId<"DealId">("d1"), toStage: "quote", revertedBy: "m1" }),
    ).rejects.toBeInstanceOf(DealStageRevertError);
  });
});
