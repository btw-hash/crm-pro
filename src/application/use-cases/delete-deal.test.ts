import { describe, expect, it } from "vitest";
import type {
  DealEventRecorder,
  RecordDealEventInput,
} from "@/application/ports/deal-event-recorder";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeDeleteDeal } from "./delete-deal";

const seedDeal: Deal = {
  id: makeId<"DealId">("d1"),
  clientId: makeId<"ClientId">("c1"),
  title: "Deal",
  stage: "qualification",
  responsibleManagerId: "m1",
};

function setup(deals: readonly Deal[] = [seedDeal]) {
  const dealsRepo = new InMemoryDealRepository(deals);
  const events: RecordDealEventInput[] = [];
  const recorder: DealEventRecorder = {
    record: async (input) => {
      events.push(input);
    },
  };
  const deleteDeal = makeDeleteDeal({ deals: dealsRepo, events: recorder });
  return { dealsRepo, deleteDeal, events };
}

const at = "2026-06-29T00:00:00.000Z";

describe("deleteDeal use-case (soft-delete)", () => {
  it("soft-deletes: the record is kept, deletedAt is set, it disappears from the list", async () => {
    const { dealsRepo, deleteDeal } = setup();
    await deleteDeal({ dealId: makeId<"DealId">("d1"), actor: "m1", at });
    // The record and history are kept (findById still returns the deal with the mark)...
    const stored = await dealsRepo.findById(makeId<"DealId">("d1"));
    expect(stored?.deletedAt).toBe(at);
    // ...but the deal disappears from lists/boards.
    expect(await dealsRepo.list()).toHaveLength(0);
  });

  it("writes a deal_deleted event to history", async () => {
    const { deleteDeal, events } = setup();
    await deleteDeal({ dealId: makeId<"DealId">("d1"), actor: "m1", at });
    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("deal_deleted");
    expect(events[0]?.actor).toBe("m1");
  });

  it("throws DealNotFoundError for a nonexistent deal", async () => {
    const { deleteDeal } = setup();
    await expect(
      deleteDeal({ dealId: makeId<"DealId">("missing"), actor: "m1", at }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });
});
