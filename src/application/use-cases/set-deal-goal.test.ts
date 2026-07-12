import { describe, expect, it } from "vitest";
import type {
  DealEventRecorder,
  RecordDealEventInput,
} from "@/application/ports/deal-event-recorder";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeSetDealGoal } from "./set-deal-goal";

const dealId = makeId<"DealId">("d1");
const deal: Deal = {
  id: dealId,
  clientId: makeId<"ClientId">("c1") as ClientId,
  title: "Deal",
  stage: "audit",
  responsibleManagerId: "manager-owens",
};

function setup(deals: readonly Deal[] = [deal]) {
  const dealsRepo = new InMemoryDealRepository(deals);
  const events: RecordDealEventInput[] = [];
  const recorder: DealEventRecorder = {
    record: async (input) => {
      events.push(input);
    },
  };
  const setDealGoal = makeSetDealGoal({ deals: dealsRepo, events: recorder });
  return { dealsRepo, setDealGoal, events };
}

describe("setDealGoal", () => {
  it("sets the goal on an existing deal", async () => {
    const { dealsRepo, setDealGoal } = setup();

    await setDealGoal({ dealId, goal: "new_sku", actor: "manager-owens" });

    expect((await dealsRepo.findById(dealId))?.goal).toBe("new_sku");
  });

  it("writes a goal_set event to the history (with actor and goal)", async () => {
    const { setDealGoal, events } = setup();

    await setDealGoal({ dealId, goal: "new_sku", actor: "manager-owens" });

    expect(events).toHaveLength(1);
    expect(events[0]?.type).toBe("goal_set");
    expect(events[0]?.actor).toBe("manager-owens");
    expect(events[0]?.summary).toContain("New SKU introduction");
  });

  it("throws DealNotFoundError for a non-existent deal", async () => {
    const { setDealGoal } = setup();

    await expect(
      setDealGoal({ dealId: makeId<"DealId">("missing"), goal: "order", actor: "manager-owens" }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });
});
