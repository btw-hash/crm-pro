import { describe, expect, it } from "vitest";
import type { SampleRequest } from "@/domain/sample/sample-request";
import {
  SampleRequestNotFoundError,
  SampleRequestValidationError,
} from "@/domain/sample/sample-request";
import { makeId } from "@/domain/shared/id";
import { InMemorySampleRequestRepository } from "@/infrastructure/persistence/in-memory-sample-request-repository";
import { makeUpdateSampleRequest } from "./update-sample-request";

const sampleId = makeId<"SampleRequestId">("s1");

const seedSample: SampleRequest = {
  id: sampleId,
  dealId: makeId<"DealId">("d1"),
  productId: makeId<"ProductId">("p1"),
  quantity: 2,
  unit: "kg",
  requestedBy: "manager-owens",
  assignedTechnologistId: "tech-a",
  requestedAt: "2026-06-21T00:00:00Z",
};

function build(seed: readonly SampleRequest[] = [seedSample]) {
  const samples = new InMemorySampleRequestRepository(seed);
  return { update: makeUpdateSampleRequest({ samples }), samples };
}

describe("updateSampleRequest", () => {
  it("updates the quantity on the request", async () => {
    const { update, samples } = build();

    const updated = await update({ sampleId, quantity: 5 });

    expect(updated.quantity).toBe(5);
    expect((await samples.findById(sampleId))?.quantity).toBe(5);
  });

  it("keeps unchanged fields (productId, assignedTechnologistId, unit)", async () => {
    const { update } = build();

    const updated = await update({ sampleId, quantity: 3 });

    expect(updated.productId).toBe(seedSample.productId);
    expect(updated.assignedTechnologistId).toBe(seedSample.assignedTechnologistId);
    expect(updated.unit).toBe(seedSample.unit);
  });

  it("throws SampleRequestNotFoundError for a non-existent request", async () => {
    const { update } = build();

    await expect(
      update({ sampleId: makeId<"SampleRequestId">("missing"), quantity: 1 }),
    ).rejects.toBeInstanceOf(SampleRequestNotFoundError);
  });

  it("throws SampleRequestValidationError for a zero quantity", async () => {
    const { update } = build();

    await expect(update({ sampleId, quantity: 0 })).rejects.toBeInstanceOf(
      SampleRequestValidationError,
    );
  });

  it("throws SampleRequestValidationError for a negative quantity", async () => {
    const { update } = build();

    await expect(update({ sampleId, quantity: -1 })).rejects.toBeInstanceOf(
      SampleRequestValidationError,
    );
  });
});
