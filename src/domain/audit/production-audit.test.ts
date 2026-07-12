import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import {
  type CreateProductionAuditInput,
  createProductionAudit,
  ProductionAuditValidationError,
} from "./production-audit";

function baseInput(): CreateProductionAuditInput {
  return {
    id: makeId<"AuditId">("a1"),
    dealId: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    createdBy: "manager-smith",
    createdAt: "2026-06-21T00:00:00Z",
  };
}

describe("createProductionAudit", () => {
  it("creates an audit when equipment is present", () => {
    const audit = createProductionAudit({
      ...baseInput(),
      equipment: ["Miwe rotary oven"],
    });

    expect(audit.equipment).toHaveLength(1);
    expect(audit.painPoints).toEqual([]);
    expect(audit.decisionMakers).toEqual([]);
  });

  it("creates an audit when only pain points are present", () => {
    const audit = createProductionAudit({
      ...baseInput(),
      painPoints: ["Filling leaks onto the trays"],
    });

    expect(audit.painPoints).toHaveLength(1);
  });

  it("throws an error if there is neither equipment nor pain points", () => {
    expect(() => createProductionAudit({ ...baseInput(), equipment: [], painPoints: [] })).toThrow(
      ProductionAuditValidationError,
    );
  });
});
