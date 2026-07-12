import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { makeGetFunnelAnalytics } from "./get-funnel-analytics";

function deal(id: string, stage: Deal["stage"], outcome?: Deal["outcome"]): Deal {
  return {
    id: makeId<"DealId">(id),
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage,
    responsibleManagerId: "m1",
    outcome,
  };
}

describe("getFunnelAnalytics", () => {
  it("aggregates all deals (no owner filter)", async () => {
    const deals = new InMemoryDealRepository([
      deal("d1", "completed", "won"),
      deal("d2", "completed", "lost"),
      deal("d3", "audit"),
    ]);
    const getFunnelAnalytics = makeGetFunnelAnalytics({ deals });

    const summary = await getFunnelAnalytics();

    expect(summary.total).toBe(3);
    expect(summary.won).toBe(1);
    expect(summary.winRate).toBeCloseTo(0.5);
  });
});
