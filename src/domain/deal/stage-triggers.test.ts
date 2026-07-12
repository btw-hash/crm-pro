import { describe, expect, it } from "vitest";
import { triggerForStage } from "./stage-triggers";

describe("triggerForStage", () => {
  it('creates a "prepare the Proposal" task on transition to quote', () => {
    expect(triggerForStage("quote")?.taskText).toContain("Proposal");
  });

  it('creates a "create order" task when the deal completes', () => {
    const trigger = triggerForStage("completed");
    expect(trigger?.taskText).toContain("order");
    expect(trigger?.dueInDays).toBe(1);
  });

  it("does not create a task for stages without a trigger (qualification)", () => {
    expect(triggerForStage("qualification")).toBeNull();
  });
});
