import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import type { ProductId } from "@/domain/product/product";
import { createQuota, QuotaError, type QuotaId } from "@/domain/quota/quota";
import { InMemoryQuotaRepository } from "@/infrastructure/persistence/in-memory-quota-repository";
import { QuotaNotFoundError, QuotaOwnershipError } from "./reserve-from-quota";
import { makeReserveFromQuota } from "./reserve-from-quota";

const pid = makeId<"ProductId">("p1") as ProductId;

function quota(id: string, mopId: string, planned: number, reserved = 0, sold = 0) {
  return createQuota({
    id: makeId<"QuotaId">(id) as QuotaId,
    mopId,
    productId: pid,
    period: { year: 2026, quarter: 2 },
    plannedVolume: planned,
    reservedVolume: reserved,
    soldVolume: sold,
  });
}

describe("reserveFromQuota use-case", () => {
  it("a successful reservation reduces the available volume", async () => {
    const repo = new InMemoryQuotaRepository([quota("q1", "mop-1", 100, 10, 5)]);
    const useCase = makeReserveFromQuota({ quotas: repo });

    await useCase({
      quotaId: makeId<"QuotaId">("q1") as QuotaId,
      qty: 30,
      requestedBy: "mop-1",
    });

    const saved = (await repo.listByMop("mop-1")).at(0);
    expect(saved?.reservedVolume).toBe(40);
  });

  it("throws QuotaNotFoundError for a nonexistent quota", async () => {
    const repo = new InMemoryQuotaRepository([]);
    const useCase = makeReserveFromQuota({ quotas: repo });

    await expect(
      useCase({
        quotaId: makeId<"QuotaId">("missing") as QuotaId,
        qty: 10,
        requestedBy: "mop-1",
      }),
    ).rejects.toThrow(QuotaNotFoundError);
  });

  it("throws QuotaOwnershipError for someone else's quota", async () => {
    const repo = new InMemoryQuotaRepository([quota("q2", "mop-2", 100)]);
    const useCase = makeReserveFromQuota({ quotas: repo });

    await expect(
      useCase({
        quotaId: makeId<"QuotaId">("q2") as QuotaId,
        qty: 10,
        requestedBy: "mop-1",
      }),
    ).rejects.toThrow(QuotaOwnershipError);
  });

  it("throws QuotaError when the available volume is exceeded", async () => {
    const repo = new InMemoryQuotaRepository([quota("q3", "mop-1", 100, 80, 10)]);
    const useCase = makeReserveFromQuota({ quotas: repo });

    await expect(
      useCase({
        quotaId: makeId<"QuotaId">("q3") as QuotaId,
        qty: 20,
        requestedBy: "mop-1",
      }),
    ).rejects.toThrow(QuotaError);
  });
});
