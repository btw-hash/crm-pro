import { describe, expect, it } from "vitest";
import {
  AuditNotFoundError,
  ProductionAuditValidationError,
  type ProductionAudit,
} from "@/domain/audit/production-audit";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryAuditRepository } from "@/infrastructure/persistence/in-memory-audit-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeUpdateProductionAudit } from "./update-production-audit";

const dealId = makeId<"DealId">("d1");
const deal: Deal = {
  id: dealId,
  clientId: makeId<"ClientId">("c1") as ClientId,
  title: "Deal",
  stage: "audit",
  responsibleManagerId: "manager-owens",
};

const auditId = makeId<"AuditId">("a1");
const seedAudit: ProductionAudit = {
  id: auditId,
  dealId,
  clientId: deal.clientId,
  equipment: ["Miwe rotary oven"],
  painPoints: [],
  decisionMakers: [],
  createdBy: "manager-owens",
  createdAt: "2026-06-21T00:00:00Z",
};

function build(auditSeed: readonly ProductionAudit[] = [seedAudit]) {
  const audits = new InMemoryAuditRepository(auditSeed);
  const deals = new InMemoryDealRepository([deal]);
  return { update: makeUpdateProductionAudit({ audits, deals }), audits };
}

describe("updateProductionAudit", () => {
  it("updates equipment and pain point fields", async () => {
    const { update, audits } = build();

    const updated = await update({
      auditId,
      equipment: ["Miwe rotary oven", "Unox combi oven"],
      painPoints: ["Uneven baking color"],
    });

    expect(updated.equipment).toHaveLength(2);
    expect(updated.painPoints).toHaveLength(1);
    expect((await audits.findById(auditId))?.equipment).toHaveLength(2);
  });

  it("doesn't update fields not included in the patch", async () => {
    const { update } = build();

    const updated = await update({ auditId, painPoints: ["Filling leaks out"] });

    expect(updated.equipment).toEqual(seedAudit.equipment);
    expect(updated.painPoints).toEqual(["Filling leaks out"]);
  });

  it("keeps unchanged metadata (createdBy, createdAt, dealId)", async () => {
    const { update } = build();

    const updated = await update({ auditId, equipment: ["Miwe oven"] });

    expect(updated.createdBy).toBe(seedAudit.createdBy);
    expect(updated.createdAt).toBe(seedAudit.createdAt);
    expect(updated.dealId).toBe(seedAudit.dealId);
  });

  it("throws AuditNotFoundError for a non-existent audit", async () => {
    const { update } = build();

    await expect(
      update({ auditId: makeId<"AuditId">("missing"), equipment: ["Oven"] }),
    ).rejects.toBeInstanceOf(AuditNotFoundError);
  });

  it("throws DealNotFoundError if the deal is gone", async () => {
    const audits = new InMemoryAuditRepository([seedAudit]);
    const deals = new InMemoryDealRepository([]);
    const update = makeUpdateProductionAudit({ audits, deals });

    await expect(update({ auditId, equipment: ["Oven"] })).rejects.toBeInstanceOf(
      DealNotFoundError,
    );
  });

  it("throws ProductionAuditValidationError when both lists are emptied", async () => {
    const { update } = build();

    await expect(update({ auditId, equipment: [], painPoints: [] })).rejects.toBeInstanceOf(
      ProductionAuditValidationError,
    );
  });
});
