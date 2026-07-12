import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import type { ProductId } from "@/domain/product/product";
import { availableVolume, createQuota, QuotaError, reserveFromQuota } from "./quota";
import type { QuotaId } from "./quota";

const pid = makeId<"ProductId">("p1") as ProductId;
const qid = makeId<"QuotaId">("q1") as QuotaId;

function quota(planned: number, reserved = 0, sold = 0) {
  return createQuota({
    id: qid,
    mopId: "mop-1",
    productId: pid,
    period: { year: 2026, quarter: 2 },
    plannedVolume: planned,
    reservedVolume: reserved,
    soldVolume: sold,
  });
}

describe("availableVolume", () => {
  it("returns plan minus reserved minus sold", () => {
    expect(availableVolume(quota(100, 20, 15))).toBe(65);
  });

  it("returns 0 when fully depleted", () => {
    expect(availableVolume(quota(100, 60, 40))).toBe(0);
  });
});

describe("reserveFromQuota", () => {
  it("increases reservedVolume by qty", () => {
    const q = quota(100, 10, 5);
    const updated = reserveFromQuota(q, 30);
    expect(updated.reservedVolume).toBe(40);
    expect(updated.plannedVolume).toBe(100);
    expect(updated.soldVolume).toBe(5);
  });

  it("allows reserving exactly the available volume", () => {
    const q = quota(100, 60, 10);
    const updated = reserveFromQuota(q, 30);
    expect(updated.reservedVolume).toBe(90);
  });

  it("throws QuotaError when qty <= 0", () => {
    expect(() => reserveFromQuota(quota(100), 0)).toThrow(QuotaError);
    expect(() => reserveFromQuota(quota(100), -5)).toThrow(QuotaError);
  });

  it("throws QuotaError when the available volume is exceeded", () => {
    const q = quota(100, 60, 20);
    expect(() => reserveFromQuota(q, 25)).toThrow(QuotaError);
  });

  it("does not mutate the original object", () => {
    const q = quota(100, 0, 0);
    reserveFromQuota(q, 50);
    expect(q.reservedVolume).toBe(0);
  });
});

describe("createQuota", () => {
  it("throws on a negative plannedVolume", () => {
    expect(() =>
      createQuota({
        id: qid,
        mopId: "m",
        productId: pid,
        period: { year: 2026, quarter: 1 },
        plannedVolume: -1,
      }),
    ).toThrow(QuotaError);
  });
});
