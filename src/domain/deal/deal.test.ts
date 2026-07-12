import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import {
  advanceDeal,
  type Deal,
  DealOutcomeError,
  DealStageRevertError,
  DealStageTransitionError,
  revertDeal,
  setDealOutcome,
} from "./deal";
import { canRevert } from "./deal-stage";
import type { DealStage } from "./deal-stage";

function makeDeal(stage: DealStage): Deal {
  return {
    id: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Test deal",
    stage,
    responsibleManagerId: "m1",
  };
}

describe("advanceDeal", () => {
  it("moves the deal to an allowed stage", () => {
    expect(advanceDeal(makeDeal("qualification"), "audit").stage).toBe("audit");
  });

  it("allows completing the deal from any active stage", () => {
    expect(advanceDeal(makeDeal("testing"), "completed").stage).toBe("completed");
  });

  it("does not mutate the original deal", () => {
    const original = makeDeal("qualification");
    advanceDeal(original, "audit");
    expect(original.stage).toBe("qualification");
  });

  it("forbids skipping intermediate funnel stages", () => {
    expect(() => advanceDeal(makeDeal("qualification"), "testing")).toThrow(
      DealStageTransitionError,
    );
    expect(() => advanceDeal(makeDeal("qualification"), "quote")).toThrow(DealStageTransitionError);
  });

  it("forbids transitions out of a terminal stage", () => {
    expect(() => advanceDeal(makeDeal("completed"), "quote")).toThrow(DealStageTransitionError);
  });
});

describe("canRevert", () => {
  it("allows reverting to an earlier open stage", () => {
    expect(canRevert("quote", "audit")).toBe(true);
    expect(canRevert("testing", "qualification")).toBe(true);
    expect(canRevert("audit", "qualification")).toBe(true);
  });

  it("forbids reverting to a terminal stage", () => {
    expect(canRevert("quote", "completed")).toBe(false);
  });

  it("forbids reverting to the same stage", () => {
    expect(canRevert("audit", "audit")).toBe(false);
  });

  it("forbids moving forward via revert", () => {
    expect(canRevert("audit", "quote")).toBe(false);
  });

  it("forbids reverting from the first stage (nowhere to go)", () => {
    expect(canRevert("qualification", "qualification")).toBe(false);
  });
});

describe("revertDeal", () => {
  it("reverts the deal to an earlier stage", () => {
    expect(revertDeal(makeDeal("quote"), "audit").stage).toBe("audit");
  });

  it("does not mutate the original deal", () => {
    const original = makeDeal("testing");
    revertDeal(original, "audit");
    expect(original.stage).toBe("testing");
  });

  it("throws DealStageRevertError on an invalid revert", () => {
    expect(() => revertDeal(makeDeal("qualification"), "completed")).toThrow(DealStageRevertError);
  });
});

describe("setDealOutcome", () => {
  it("sets the outcome (Won/Lost) on a completed deal", () => {
    expect(setDealOutcome(makeDeal("completed"), "won").outcome).toBe("won");
    expect(setDealOutcome(makeDeal("completed"), "lost").outcome).toBe("lost");
  });

  it("allows correcting the outcome (won → lost)", () => {
    const won = setDealOutcome(makeDeal("completed"), "won");
    expect(setDealOutcome(won, "lost").outcome).toBe("lost");
  });

  it("does not mutate the original deal", () => {
    const original = makeDeal("completed");
    setDealOutcome(original, "won");
    expect(original.outcome).toBeUndefined();
  });

  it("throws DealOutcomeError if the deal is not completed", () => {
    expect(() => setDealOutcome(makeDeal("quote"), "won")).toThrow(DealOutcomeError);
    expect(() => setDealOutcome(makeDeal("qualification"), "lost")).toThrow(DealOutcomeError);
  });
});
