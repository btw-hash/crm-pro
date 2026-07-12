import { describe, expect, it } from "vitest";
import { makeSaveDealQualification } from "./save-deal-qualification";
import { makeGetDealQualification } from "./get-deal-qualification";
import { InMemoryDealQualificationRepository } from "@/infrastructure/persistence/in-memory-deal-qualification-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { seedDeals } from "@/infrastructure/persistence/seed";
import { makeId } from "@/domain/shared/id";
import type { DealId } from "@/domain/deal/deal";
import type { DealQualificationId } from "@/domain/deal/deal-qualification";
import { DealNotFoundError } from "./advance-deal-stage";

const deals = new InMemoryDealRepository(seedDeals);
const existingDealId = seedDeals[0]!.id as DealId;
const qualId = makeId<"DealQualificationId">("q-test-1") as DealQualificationId;

describe("saveDealQualification", () => {
  it("saves and can be retrieved by dealId", async () => {
    const qualifications = new InMemoryDealQualificationRepository();
    const save = makeSaveDealQualification({ qualifications, deals });
    const get = makeGetDealQualification({ qualifications });

    await save({
      id: qualId,
      dealId: existingDealId,
      segment: "confectionery production",
      productionScale: "mid-size workshop",
      savedAt: "2024-01-01T00:00:00Z",
    });

    const result = await get(existingDealId);
    expect(result).not.toBeNull();
    expect(result!.segment).toBe("confectionery production");
    expect(result!.productionScale).toBe("mid-size workshop");
    expect(result!.dealId).toBe(existingDealId);
  });

  it("upserts: second save for same dealId replaces data", async () => {
    const qualifications = new InMemoryDealQualificationRepository();
    const save = makeSaveDealQualification({ qualifications, deals });
    const get = makeGetDealQualification({ qualifications });

    await save({
      id: qualId,
      dealId: existingDealId,
      segment: "first",
      savedAt: "2024-01-01T00:00:00Z",
    });
    await save({
      id: makeId<"DealQualificationId">("q-test-2") as DealQualificationId,
      dealId: existingDealId,
      segment: "second",
      savedAt: "2024-01-02T00:00:00Z",
    });

    const result = await get(existingDealId);
    expect(result!.segment).toBe("second");
  });

  it("throws DealNotFoundError for unknown dealId", async () => {
    const qualifications = new InMemoryDealQualificationRepository();
    const save = makeSaveDealQualification({ qualifications, deals });

    await expect(
      save({
        id: qualId,
        dealId: makeId<"DealId">("no-such-deal") as DealId,
        savedAt: "2024-01-01T00:00:00Z",
      }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });

  it("stores all nullable fields correctly via save+get round-trip", async () => {
    const qualifications = new InMemoryDealQualificationRepository();
    const save = makeSaveDealQualification({ qualifications, deals });
    const get = makeGetDealQualification({ qualifications });

    await save({
      id: qualId,
      dealId: existingDealId,
      needTask: "replace the filling",
      urgency: "High",
      decisionMaker: "Smith",
      volumePerMonth: "4 t/month",
      savedAt: "2024-01-01T00:00:00Z",
    });

    const result = await get(existingDealId);
    expect(result!.needTask).toBe("replace the filling");
    expect(result!.urgency).toBe("High");
    expect(result!.decisionMaker).toBe("Smith");
    expect(result!.volumePerMonth).toBe("4 t/month");
    expect(result!.segment).toBeNull();
  });

  it("returns null for unknown dealId via get", async () => {
    const qualifications = new InMemoryDealQualificationRepository();
    const get = makeGetDealQualification({ qualifications });
    const result = await get(makeId<"DealId">("no-such-deal") as DealId);
    expect(result).toBeNull();
  });
});
