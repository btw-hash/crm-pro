import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { createSampleRequest, SampleRequestValidationError } from "./sample-request";

const base = {
  id: makeId<"SampleRequestId">("s1"),
  dealId: makeId<"DealId">("d1"),
  productId: makeId<"ProductId">("p1"),
  quantity: 2,
  unit: "kg",
  requestedBy: "manager-owens",
  assignedTechnologistId: "tech-kent",
  requestedAt: "2026-06-21T00:00:00Z",
};

describe("sampleRequest", () => {
  it("is created with a valid quantity and an assigned technologist", () => {
    const req = createSampleRequest(base);
    expect(req.quantity).toBe(2);
    expect(req.unit).toBe("kg");
    expect(req.assignedTechnologistId).toBe("tech-kent");
  });

  it("rejects a non-positive quantity", () => {
    expect(() => createSampleRequest({ ...base, quantity: 0 })).toThrow(
      SampleRequestValidationError,
    );
    expect(() => createSampleRequest({ ...base, quantity: -1 })).toThrow(
      SampleRequestValidationError,
    );
  });

  it("rejects a request with no assigned technologist", () => {
    expect(() => createSampleRequest({ ...base, assignedTechnologistId: "  " })).toThrow(
      SampleRequestValidationError,
    );
  });
});
