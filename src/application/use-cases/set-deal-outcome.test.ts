import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { StoringDealEventRecorder } from "@/infrastructure/persistence/storing-deal-event-recorder";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeSetDealOutcome } from "./set-deal-outcome";

const dealId = makeId<"DealId">("d1");

function dealAt(stage: DealStage): Deal {
  return {
    id: dealId,
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage,
    responsibleManagerId: "m1",
  };
}

function build(stage: DealStage) {
  const deals = new InMemoryDealRepository([dealAt(stage)]);
  const events = new InMemoryDealEventRepository();
  return {
    setOutcome: makeSetDealOutcome({ deals, events: new StoringDealEventRecorder(events) }),
    deals,
    events,
  };
}

describe("makeSetDealOutcome", () => {
  it("sets the outcome on a completed deal and writes an outcome_set event", async () => {
    const { setOutcome, deals, events } = build("completed");

    const updated = await setOutcome({ dealId, outcome: "won", actor: "m1" });

    expect(updated.outcome).toBe("won");
    expect((await deals.findById(dealId))?.outcome).toBe("won");
    const recorded = await events.listByDeal(dealId);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.type).toBe("outcome_set");
  });

  it("throws a domain error on an incomplete deal", async () => {
    const { setOutcome } = build("quote");
    await expect(setOutcome({ dealId, outcome: "won", actor: "m1" })).rejects.toThrow();
  });

  it("throws DealNotFoundError for a non-existent deal", async () => {
    const { setOutcome } = build("completed");
    await expect(
      setOutcome({ dealId: makeId<"DealId">("missing"), outcome: "won", actor: "m1" }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });
});
