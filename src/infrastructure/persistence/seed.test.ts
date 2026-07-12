import { describe, expect, it } from "vitest";
import { nextStep } from "@/domain/activity/activity";
import { dealNeedsNextStep } from "@/domain/deal/deal-attention";
import { isTerminal } from "@/domain/deal/deal-stage";
import { seedActivities, seedDeals } from "./seed";

/**
 * The /deals demo board should look "alive": most active deals have a planned
 * next step (an open task), but NOT all of them — otherwise the demonstration of
 * the "No next step" view and the red Score Pills disappears (#173).
 */
describe("seed: next step on active deals", () => {
  const activeDeals = seedDeals.filter((deal) => !isTerminal(deal.stage));
  const activitiesOf = (dealId: string) => seedActivities.filter((a) => a.dealId === dealId);

  it("≥ half of active deals have an open next step", () => {
    const withNextStep = activeDeals.filter((deal) => nextStep(activitiesOf(deal.id)) !== null);
    // Uses the domain function rather than a hardcoded value, so the invariant lives with the model.
    expect(withNextStep.length / activeDeals.length).toBeGreaterThanOrEqual(0.5);
  });

  it("some active deals intentionally have no next step (for demo purposes)", () => {
    const withoutNextStep = activeDeals.filter((deal) =>
      dealNeedsNextStep(deal, activitiesOf(deal.id)),
    );
    expect(withoutNextStep.length).toBeGreaterThan(0);
  });

  it("the next step is an open task tied to its own deal and manager", () => {
    for (const deal of activeDeals) {
      const step = nextStep(activitiesOf(deal.id));
      if (step === null) continue;
      expect(step.kind).toBe("task");
      expect(step.done).toBe(false);
      expect(step.dealId).toBe(deal.id);
      // Step author = the deal's responsible manager (owner boundary: a manager sees their own step).
      expect(step.author).toBe(deal.responsibleManagerId);
      expect(step.dueDate).not.toBeNull();
    }
  });
});
