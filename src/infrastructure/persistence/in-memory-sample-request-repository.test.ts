import { describe, expect, it } from "vitest";
import type { SampleRequest } from "@/domain/sample/sample-request";
import { makeId } from "@/domain/shared/id";
import { InMemorySampleRequestRepository } from "./in-memory-sample-request-repository";

function sample(id: string, requestedAt: string, assignedTechnologistId: string): SampleRequest {
  return {
    id: makeId<"SampleRequestId">(id),
    dealId: makeId<"DealId">(`deal-${id}`),
    productId: makeId<"ProductId">("p1"),
    quantity: 1,
    unit: "kg",
    requestedBy: "manager-smith",
    assignedTechnologistId,
    requestedAt,
  };
}

describe("InMemorySampleRequestRepository.findLast", () => {
  it("returns null when there are no requests", async () => {
    expect(await new InMemorySampleRequestRepository().findLast()).toBeNull();
  });

  it("picks the request with the later requestedAt", async () => {
    const repo = new InMemorySampleRequestRepository();
    await repo.save(sample("s1", "2026-06-21T00:00:00Z", "tech-a"));
    await repo.save(sample("s2", "2026-06-21T09:00:00Z", "tech-b"));

    expect((await repo.findLast())?.id).toBe("s2");
  });

  it("with equal requestedAt, deterministically picks the last saved", async () => {
    const repo = new InMemorySampleRequestRepository();
    const sameTime = "2026-06-21T00:00:00Z";
    await repo.save(sample("s1", sameTime, "tech-a"));
    await repo.save(sample("s2", sameTime, "tech-b"));

    // Without the secondary key, round-robin would double up the technologist; the "last" one is s2.
    expect((await repo.findLast())?.id).toBe("s2");
    expect((await repo.findLast())?.assignedTechnologistId).toBe("tech-b");
  });
});
