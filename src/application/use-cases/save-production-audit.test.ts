import { describe, expect, it } from "vitest";
import { ProductionAuditValidationError } from "@/domain/audit/production-audit";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryAuditRepository } from "@/infrastructure/persistence/in-memory-audit-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeSaveProductionAudit, type SaveProductionAuditInput } from "./save-production-audit";

const dealId = makeId<"DealId">("d1");
const deal: Deal = {
  id: dealId,
  clientId: makeId<"ClientId">("c1") as ClientId,
  title: "Deal",
  stage: "audit",
  responsibleManagerId: "manager-owens",
};

function build() {
  const deals = new InMemoryDealRepository([deal]);
  const audits = new InMemoryAuditRepository();
  return { save: makeSaveProductionAudit({ audits, deals }), audits };
}

function input(): SaveProductionAuditInput {
  return {
    id: makeId<"AuditId">("a1"),
    dealId,
    clientId: deal.clientId,
    equipment: ["Miwe rotary oven"],
    painPoints: [],
    createdBy: "manager-owens",
    createdAt: "2026-06-21T00:00:00Z",
  };
}

describe("saveProductionAudit", () => {
  it("saves an audit for an existing deal", async () => {
    const { save, audits } = build();

    const audit = await save(input());

    expect(audit.id).toBe(makeId<"AuditId">("a1"));
    expect(await audits.findByDealId(dealId)).not.toBeNull();
  });

  it("throws DealNotFoundError for a nonexistent deal", async () => {
    const { save } = build();
    await expect(save({ ...input(), dealId: makeId<"DealId">("missing") })).rejects.toBeInstanceOf(
      DealNotFoundError,
    );
  });

  it("propagates a validation error for an empty audit", async () => {
    const { save } = build();
    await expect(save({ ...input(), equipment: [], painPoints: [] })).rejects.toBeInstanceOf(
      ProductionAuditValidationError,
    );
  });
});
