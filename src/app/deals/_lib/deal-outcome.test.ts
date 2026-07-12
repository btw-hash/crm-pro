import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { outcomeBadge, reachedStage, sectionVisibilityForDeal } from "./deal-outcome";

const deal = (over: Partial<Deal>): Deal => ({
  id: makeId<"DealId">("d1"),
  clientId: makeId<"ClientId">("c1") as ClientId,
  title: "Test",
  stage: "completed",
  responsibleManagerId: "m1",
  ...over,
});

describe("outcomeBadge", () => {
  it('won → "Won" badge', () => {
    const badge = outcomeBadge(deal({ outcome: "won" }));
    expect(badge?.outcome).toBe("won");
    expect(badge?.label).toBe("Won");
  });

  it('lost → "Lost" badge', () => {
    const badge = outcomeBadge(deal({ outcome: "lost" }));
    expect(badge?.outcome).toBe("lost");
    expect(badge?.label).toBe("Lost");
  });

  it("no outcome → null (no badge shown)", () => {
    expect(outcomeBadge(deal({ stage: "quote", outcome: undefined }))).toBeNull();
  });
});

describe("reachedStage", () => {
  it("there's a test act → reached testing", () => {
    expect(reachedStage({ hasAudit: true, sampleCount: 1, hasTestAct: true })).toBe("testing");
  });

  it('there are samples, no act → reached "Tech request" (audit)', () => {
    expect(reachedStage({ hasAudit: true, sampleCount: 2, hasTestAct: false })).toBe("audit");
  });

  it("only an audit → audit", () => {
    expect(reachedStage({ hasAudit: true, sampleCount: 0, hasTestAct: false })).toBe("audit");
  });

  it("no artifacts → qualification", () => {
    expect(reachedStage({ hasAudit: false, sampleCount: 0, hasTestAct: false })).toBe(
      "qualification",
    );
  });
});

describe("sectionVisibilityForDeal", () => {
  it("won completed: completed sections stay readonly (same as base logic)", () => {
    const d = deal({ stage: "completed", outcome: "won" });
    expect(sectionVisibilityForDeal("quote", d, "quote")).toBe("readonly");
    expect(sectionVisibilityForDeal("audit", d, "quote")).toBe("readonly");
  });

  it("lost completed: a skipped (past the reached) stage is NOT marked completed (#28)", () => {
    // REF-5: reached testing, lost bypassing quote → "Proposal" was never done.
    const d = deal({ stage: "completed", outcome: "lost" });
    expect(sectionVisibilityForDeal("quote", d, "testing")).toBe("locked");
  });

  it("lost completed: actually-reached stages stay completed", () => {
    const d = deal({ stage: "completed", outcome: "lost" });
    expect(sectionVisibilityForDeal("audit", d, "testing")).toBe("readonly");
    expect(sectionVisibilityForDeal("testing", d, "testing")).toBe("readonly");
  });

  it("active deal: base sectionVisibility behavior", () => {
    const d = deal({ stage: "audit", outcome: undefined });
    expect(sectionVisibilityForDeal("audit", d, "audit")).toBe("active");
    expect(sectionVisibilityForDeal("quote", d, "audit")).toBe("locked");
  });
});
