import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import type { Deal } from "./deal";
import type { DealGoal } from "./deal-goal";
import type { DealStage } from "./deal-stage";
import { summarizeFunnel } from "./funnel-analytics";

let seq = 0;
function deal(stage: DealStage, goal?: DealGoal): Deal {
  seq += 1;
  return {
    id: makeId<"DealId">(`d${seq}`),
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage,
    responsibleManagerId: "m1",
    goal,
  };
}

describe("summarizeFunnel", () => {
  it("counts totals, active, and win-rate from outcome (not from stage)", () => {
    const summary = summarizeFunnel([
      deal("qualification"),
      deal("testing"),
      { ...deal("completed"), outcome: "won" },
      { ...deal("completed"), outcome: "won" },
      { ...deal("completed"), outcome: "lost" },
    ]);

    expect(summary.total).toBe(5);
    expect(summary.active).toBe(2); // qualification + testing
    expect(summary.won).toBe(2);
    expect(summary.lost).toBe(1);
    expect(summary.winRate).toBeCloseTo(2 / 3); // won / (won+lost)
  });

  it("win-rate = 0 if there are no closed deals with an outcome", () => {
    expect(summarizeFunnel([deal("audit"), deal("quote")]).winRate).toBe(0);
  });

  it("completed without an outcome does not affect win-rate", () => {
    const summary = summarizeFunnel([deal("completed")]);
    expect(summary.won).toBe(0);
    expect(summary.lost).toBe(0);
    expect(summary.winRate).toBe(0);
  });

  it('breaks down by stage and goal (no goal → "other")', () => {
    const summary = summarizeFunnel([
      deal("audit", "new_sku"),
      deal("audit"),
      deal("quote", "order"),
    ]);

    const auditStat = summary.byStage.find((s) => s.stage === "audit");
    expect(auditStat?.count).toBe(2);
    const otherGoal = summary.byGoal.find((g) => g.goal === "other");
    expect(otherGoal?.count).toBe(1); // deal without a goal
  });
});
