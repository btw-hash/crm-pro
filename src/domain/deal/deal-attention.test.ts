import { describe, expect, it } from "vitest";
import type { Activity } from "@/domain/activity/activity";
import type { ClientId } from "@/domain/client/client";
import type { DealEvent, DealEventType } from "@/domain/deal-event/deal-event";
import { makeId } from "@/domain/shared/id";
import { dealHealth, dealNeedsNextStep, daysOnStage, isStaleOnStage } from "./deal-attention";
import type { Deal } from "./deal";
import type { DealStage } from "./deal-stage";

function deal(stage: DealStage): Deal {
  return {
    id: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage,
    responsibleManagerId: "m1",
  };
}

function openTask(): Activity {
  return {
    id: makeId<"ActivityId">("a1"),
    dealId: makeId<"DealId">("d1"),
    clientId: null,
    kind: "task",
    text: "Call back",
    author: "m1",
    createdAt: "2026-06-22T10:00:00.000Z",
    dueDate: "2026-06-25",
    done: false,
  };
}

describe("dealNeedsNextStep", () => {
  it("active deal with no open tasks — needs a next step", () => {
    expect(dealNeedsNextStep(deal("audit"), [])).toBe(true);
  });

  it("active deal with an open task — has a step", () => {
    expect(dealNeedsNextStep(deal("audit"), [openTask()])).toBe(false);
  });

  it("active deal with only a completed task — needs a step again", () => {
    expect(dealNeedsNextStep(deal("audit"), [{ ...openTask(), done: true }])).toBe(true);
  });

  it("completed deal doesn't need a step (terminal)", () => {
    expect(dealNeedsNextStep(deal("completed"), [])).toBe(false);
  });
});

function event(type: DealEventType, createdAt: string): DealEvent {
  return {
    id: makeId<"DealEventId">(`e-${createdAt}`),
    dealId: makeId<"DealId">("d1"),
    type,
    summary: "Event",
    actor: "m1",
    createdAt,
    fromStage: null,
    toStage: null,
  };
}

const NOW = "2026-06-24T00:00:00.000Z";

describe("daysOnStage", () => {
  it("no stage-change events — null (no reference point)", () => {
    expect(daysOnStage([], NOW)).toBeNull();
    expect(daysOnStage([event("audit_saved", "2026-06-10T00:00:00.000Z")], NOW)).toBeNull();
  });

  it("counts days from the last stage change to now", () => {
    expect(daysOnStage([event("stage_changed", "2026-06-17T00:00:00.000Z")], NOW)).toBe(7);
  });

  it("takes the latest stage event (entry into the current stage)", () => {
    const events = [
      event("stage_changed", "2026-06-01T00:00:00.000Z"),
      event("stage_reverted", "2026-06-20T00:00:00.000Z"),
    ];
    expect(daysOnStage(events, NOW)).toBe(4);
  });

  it("an event in the future relative to now — null (guard)", () => {
    expect(daysOnStage([event("stage_changed", "2026-06-30T00:00:00.000Z")], NOW)).toBeNull();
  });
});

describe("isStaleOnStage", () => {
  it("≥ threshold and not terminal — stuck", () => {
    expect(isStaleOnStage(deal("quote"), 14)).toBe(true);
    expect(isStaleOnStage(deal("quote"), 30)).toBe(true);
  });
  it("below threshold — not stuck", () => {
    expect(isStaleOnStage(deal("quote"), 13)).toBe(false);
  });
  it("unknown (null) — not stuck", () => {
    expect(isStaleOnStage(deal("quote"), null)).toBe(false);
  });
  it("terminal is never stuck, even with a large day count", () => {
    expect(isStaleOnStage(deal("completed"), 99)).toBe(false);
  });
});

describe("dealHealth", () => {
  it("active, has a step, fresh on stage — healthy", () => {
    expect(dealHealth(deal("audit"), false, 3)).toBe("healthy");
    expect(dealHealth(deal("audit"), false, null)).toBe("healthy");
  });

  it("no next step (but fresh) — attention", () => {
    expect(dealHealth(deal("audit"), true, 2)).toBe("attention");
  });

  it("lingering ≥7 days, but has a step — attention", () => {
    expect(dealHealth(deal("audit"), false, 7)).toBe("attention");
    expect(dealHealth(deal("audit"), false, 13)).toBe("attention");
  });

  it("stuck ≥14 days — critical", () => {
    expect(dealHealth(deal("quote"), false, 14)).toBe("critical");
  });

  it("no step and lingering ≥7 — critical", () => {
    expect(dealHealth(deal("audit"), true, 9)).toBe("critical");
  });

  it("terminal — neutral regardless of signals", () => {
    expect(dealHealth(deal("completed"), true, 99)).toBe("neutral");
  });
});
