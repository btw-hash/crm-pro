import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { createDealEvent, DealEventValidationError } from "./deal-event";

function input(overrides: Partial<Parameters<typeof createDealEvent>[0]> = {}) {
  return {
    id: makeId<"DealEventId">("e1"),
    dealId: makeId<"DealId">("d1"),
    type: "stage_changed" as const,
    summary: "Stage: Qualification → Tech request",
    actor: "m1",
    createdAt: "2026-06-22T10:00:00.000Z",
    fromStage: "qualification" as const,
    toStage: "audit" as const,
    ...overrides,
  };
}

describe("createDealEvent", () => {
  it("creates an event and trims the description", () => {
    const event = createDealEvent(input({ summary: "  Stage change  " }));
    expect(event.summary).toBe("Stage change");
    expect(event.type).toBe("stage_changed");
    expect(event.toStage).toBe("audit");
  });

  it("defaults stages to null (not a stage event)", () => {
    const event = createDealEvent(
      input({ type: "goal_set", fromStage: undefined, toStage: undefined }),
    );
    expect(event.fromStage).toBeNull();
    expect(event.toStage).toBeNull();
  });

  it("throws an error on an empty description", () => {
    expect(() => createDealEvent(input({ summary: "   " }))).toThrow(DealEventValidationError);
  });
});
