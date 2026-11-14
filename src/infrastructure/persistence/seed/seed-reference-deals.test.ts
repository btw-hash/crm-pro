import { describe, expect, it } from "vitest";
import { DEAL_OUTCOMES, DEAL_STAGES, FUNNEL_TRACK } from "@/domain/deal/deal-stage";
import { TECH_REQUEST_KINDS } from "@/domain/tech-request/tech-request";
import { seedProducts } from "./catalog";
import {
  seedActivities,
  seedAudits,
  seedDealEvents,
  seedDeals,
  seedNotifications,
  seedReferenceTechRequests,
  seedSampleRequests,
  seedTestActs,
} from "./deals";
import { seedClients } from "./clients";
import { managers, technologists, heads, clientIds } from "./refs";

/**
 * Invariants of the five "reference" end-to-end deals (#305). These are curated demo
 * stories for showing the head of sales: at EVERY completed stage the artifacts are
 * filled in. The test guards data consistency — so the demo doesn't "fall apart" when
 * the seed is edited.
 */

const REF_IDS = ["deal-ref-1", "deal-ref-2", "deal-ref-3", "deal-ref-4", "deal-ref-5"] as const;
const refDeals = seedDeals.filter((d) => (REF_IDS as readonly string[]).includes(d.id));

const clientIdSet = new Set(seedClients.map((c) => c.id));
const productIdSet = new Set(seedProducts.map((p) => p.id));
const dealIdSet = new Set(seedDeals.map((d) => d.id));
const managerIdSet = new Set<string>(Object.values(managers));
const personIdSet = new Set<string>([
  ...Object.values(managers),
  ...Object.values(technologists),
  ...Object.values(heads),
]);

// Stage rank in the funnel — for checking "stage completed" (below the current rank).
const stageRank = (stage: string): number => FUNNEL_TRACK.indexOf(stage as never);

describe("reference deals (#305): composition and consistency", () => {
  it("exactly 5 reference deals with unique ids", () => {
    expect(refDeals).toHaveLength(5);
    expect(new Set(refDeals.map((d) => d.id)).size).toBe(5);
  });

  it("every reference deal has a valid stage, outcome, client and manager", () => {
    for (const deal of refDeals) {
      expect(DEAL_STAGES).toContain(deal.stage);
      expect(clientIdSet.has(deal.clientId)).toBe(true);
      expect(managerIdSet.has(deal.responsibleManagerId)).toBe(true);
      if (deal.stage === "completed") {
        expect(deal.outcome).toBeDefined();
        expect(DEAL_OUTCOMES).toContain(deal.outcome);
      } else {
        // Outcome — only for completed deals (model #357).
        expect(deal.outcome).toBeUndefined();
      }
    }
  });

  it("together cover every funnel stage (as current or as completed) and both outcomes", () => {
    // "Coverage" = the stage shows up in someone's funnel: either it's a reference deal's
    // current stage, or it's completed (there's a transition event OUT of it). This way
    // the curated deals show EVERY stage with filled-in artifacts, without being forced
    // to "freeze" on qualification/audit.
    const covered = new Set<string>(refDeals.map((d) => d.stage));
    for (const e of seedDealEvents) {
      if (e.fromStage && (REF_IDS as readonly string[]).includes(e.dealId)) {
        covered.add(e.fromStage);
      }
    }
    for (const stage of DEAL_STAGES) {
      expect(covered.has(stage), `stage ${stage} is covered by a reference deal`).toBe(true);
    }
    const outcomes = new Set(refDeals.filter((d) => d.stage === "completed").map((d) => d.outcome));
    expect(outcomes.has("won")).toBe(true);
    expect(outcomes.has("lost")).toBe(true);
  });
});

describe("reference deals (#305): artifacts at every completed stage", () => {
  it("every deal past the Audit stage has an audit checklist", () => {
    for (const deal of refDeals) {
      if (stageRank(deal.stage) >= stageRank("audit")) {
        const audit = seedAudits.find((a) => a.dealId === deal.id);
        expect(audit, `audit for ${deal.id}`).toBeDefined();
        // Audit is non-empty: has equipment or pain points.
        expect((audit?.equipment.length ?? 0) + (audit?.painPoints.length ?? 0)).toBeGreaterThan(0);
      }
    }
  });

  it("every deal past the Test request stage has a reserved sample", () => {
    for (const deal of refDeals) {
      if (stageRank(deal.stage) >= stageRank("test_requested")) {
        const sample = seedSampleRequests.find((s) => s.dealId === deal.id);
        expect(sample, `sample for ${deal.id}`).toBeDefined();
        expect(sample?.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("every deal past the Testing stage has a test act", () => {
    for (const deal of refDeals) {
      if (stageRank(deal.stage) > stageRank("testing")) {
        // Testing stage fully completed → the act is recorded.
        const act = seedTestActs.find((a) => a.dealId === deal.id);
        expect(act, `act for ${deal.id}`).toBeDefined();
      }
    }
  });

  it("the 'lost' outcome is backed by a failed act, 'won' by a successful one", () => {
    const won = refDeals.find((d) => d.outcome === "won");
    const lost = refDeals.find((d) => d.outcome === "lost");
    expect(seedTestActs.find((a) => a.dealId === won?.id)?.result).toBe("success");
    expect(seedTestActs.find((a) => a.dealId === lost?.id)?.result).toBe("failure");
  });

  it("every reference deal has a rich feed: >=3 activities and >=1 event", () => {
    for (const deal of refDeals) {
      const acts = seedActivities.filter((a) => a.dealId === deal.id);
      const events = seedDealEvents.filter((e) => e.dealId === deal.id);
      expect(acts.length, `activities ${deal.id}`).toBeGreaterThanOrEqual(3);
      expect(events.length, `events ${deal.id}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("reference deals (#305): referential integrity", () => {
  it("audits/acts/samples reference existing deals and products", () => {
    for (const a of seedAudits) {
      expect(dealIdSet.has(a.dealId)).toBe(true);
      expect(clientIdSet.has(a.clientId)).toBe(true);
    }
    for (const t of seedTestActs) {
      expect(dealIdSet.has(t.dealId)).toBe(true);
    }
    for (const s of seedSampleRequests) {
      expect(dealIdSet.has(s.dealId)).toBe(true);
      expect(productIdSet.has(s.productId)).toBe(true);
      expect(personIdSet.has(s.assignedTechnologistId)).toBe(true);
    }
  });

  it("technologist requests on reference deals are valid and linked to deals", () => {
    for (const tr of seedReferenceTechRequests) {
      expect(dealIdSet.has(tr.dealId)).toBe(true);
      expect(clientIdSet.has(tr.clientId)).toBe(true);
      expect(TECH_REQUEST_KINDS).toContain(tr.kind);
      expect(tr.note.trim().length).toBeGreaterThan(0);
    }
  });

  it("artifact ids are unique within their type", () => {
    const uniq = (xs: readonly { id: string }[]) => new Set(xs.map((x) => x.id)).size === xs.length;
    expect(uniq(seedAudits)).toBe(true);
    expect(uniq(seedTestActs)).toBe(true);
    expect(uniq(seedSampleRequests)).toBe(true);
    expect(uniq(seedReferenceTechRequests)).toBe(true);
  });

  it("reference-deal notifications are addressed to existing people", () => {
    const refNotifications = seedNotifications.filter(
      (n) => n.dealId !== null && (REF_IDS as readonly string[]).includes(n.dealId),
    );
    expect(refNotifications.length).toBeGreaterThan(0);
    for (const n of refNotifications) {
      expect(personIdSet.has(n.recipientId)).toBe(true);
    }
  });
});

describe("reference deals (#305): global id uniqueness in the seed", () => {
  it("all deal ids are unique", () => {
    expect(new Set(seedDeals.map((d) => d.id)).size).toBe(seedDeals.length);
  });
  it("all activity ids are unique", () => {
    expect(new Set(seedActivities.map((a) => a.id)).size).toBe(seedActivities.length);
  });
  it("all event ids are unique", () => {
    expect(new Set(seedDealEvents.map((e) => e.id)).size).toBe(seedDealEvents.length);
  });
  it("all notification ids are unique", () => {
    expect(new Set(seedNotifications.map((n) => n.id)).size).toBe(seedNotifications.length);
  });
  it("reference clients exist (bakeries/confectioneries from refs)", () => {
    for (const cid of [
      clientIds.breadWorks,
      clientIds.sweetWorld,
      clientIds.warmBread,
      clientIds.confiLux,
      clientIds.lakesideTrading,
    ]) {
      expect(clientIdSet.has(cid)).toBe(true);
    }
  });
});
