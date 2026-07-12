import { describe, expect, it } from "vitest";
import { createDealQualification } from "./deal-qualification";
import { makeId } from "@/domain/shared/id";
import type { DealId } from "@/domain/deal/deal";
import type { DealQualificationId } from "./deal-qualification";

const dealId = makeId<"DealId">("deal-1") as DealId;
const qualId = makeId<"DealQualificationId">("q-1") as DealQualificationId;

describe("createDealQualification", () => {
  it("creates with all nullable fields as null when omitted", () => {
    const q = createDealQualification({ id: qualId, dealId, savedAt: "2024-01-01T00:00:00Z" });
    expect(q.segment).toBeNull();
    expect(q.productionScale).toBeNull();
    expect(q.needTask).toBeNull();
    expect(q.targetProduct).toBeNull();
    expect(q.volumeHint).toBeNull();
    expect(q.urgency).toBeNull();
    expect(q.decisionMaker).toBeNull();
    expect(q.contactPerson).toBeNull();
    expect(q.volumePerMonth).toBeNull();
    expect(q.revenuePotential).toBeNull();
    expect(q.paymentTerms).toBeNull();
    expect(q.creditLimitHint).toBeNull();
  });

  it("trims text fields and stores non-empty values", () => {
    const q = createDealQualification({
      id: qualId,
      dealId,
      segment: "  confectionery production  ",
      productionScale: " mid-size plant ",
      savedAt: "2024-01-01T00:00:00Z",
    });
    expect(q.segment).toBe("confectionery production");
    expect(q.productionScale).toBe("mid-size plant");
  });

  it("collapses whitespace-only strings to null", () => {
    const q = createDealQualification({
      id: qualId,
      dealId,
      segment: "   ",
      needTask: "",
      savedAt: "2024-01-01T00:00:00Z",
    });
    expect(q.segment).toBeNull();
    expect(q.needTask).toBeNull();
  });

  it("collapses all text fields independently (urgency whitespace → null)", () => {
    const q = createDealQualification({
      id: qualId,
      dealId,
      urgency: "  ",
      targetProduct: "Lecithin",
      savedAt: "2024-01-01T00:00:00Z",
    });
    expect(q.urgency).toBeNull();
    expect(q.targetProduct).toBe("Lecithin");
  });

  it("preserves id and dealId and savedAt unchanged", () => {
    const q = createDealQualification({ id: qualId, dealId, savedAt: "2024-06-01T12:00:00Z" });
    expect(q.id).toBe(qualId);
    expect(q.dealId).toBe(dealId);
    expect(q.savedAt).toBe("2024-06-01T12:00:00Z");
  });
});
