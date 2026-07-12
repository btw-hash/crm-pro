import { describe, expect, it } from "vitest";
import type { KanbanDeal } from "./deals-kanban";
import { SAVED_VIEWS, applySavedView, isSavedViewId } from "./saved-views";

function deal(over: Partial<KanbanDeal>): KanbanDeal {
  return {
    id: "d",
    title: "Deal",
    stage: "audit",
    clientId: "c",
    clientName: "Client",
    managerName: "Manager",
    goal: "other",
    needsNextStep: false,
    daysOnStage: null,
    stale: false,
    health: "healthy",
    isMine: false,
    ...over,
  };
}

describe("isSavedViewId", () => {
  it("recognizes valid ids and rejects everything else", () => {
    expect(isSavedViewId("critical")).toBe(true);
    expect(isSavedViewId("all")).toBe(true);
    expect(isSavedViewId("nope")).toBe(false);
    expect(isSavedViewId(null)).toBe(false);
    expect(isSavedViewId(undefined)).toBe(false);
  });
});

describe("applySavedView", () => {
  const deals: KanbanDeal[] = [
    deal({ id: "1", isMine: true, stage: "audit", needsNextStep: true, health: "attention" }),
    deal({ id: "2", isMine: false, stage: "quote", health: "critical", needsNextStep: false }),
    deal({ id: "3", isMine: true, stage: "completed", health: "neutral" }), // terminal
    deal({ id: "4", isMine: true, stage: "testing", health: "healthy", needsNextStep: false }),
  ];

  it('"All" — no filter', () => {
    expect(applySavedView(deals, "all")).toHaveLength(4);
  });

  it('"Mine" — mine and not terminal', () => {
    const ids = applySavedView(deals, "mine").map((d) => d.id);
    expect(ids).toEqual(["1", "4"]); // 3 is terminal, 2 isn't mine
  });

  it('"No next step" — needsNextStep', () => {
    expect(applySavedView(deals, "no-next-step").map((d) => d.id)).toEqual(["1"]);
  });

  it('"Critical" — health=critical', () => {
    expect(applySavedView(deals, "critical").map((d) => d.id)).toEqual(["2"]);
  });

  it("all four views are declared", () => {
    expect(SAVED_VIEWS.map((v) => v.id)).toEqual(["all", "mine", "critical", "no-next-step"]);
  });
});
