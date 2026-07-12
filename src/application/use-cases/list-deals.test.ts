import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import type { Viewer } from "@/domain/shared/viewer";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { makeListDeals } from "./list-deals";

const deals: readonly Deal[] = [
  {
    id: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal A",
    stage: "audit",
    responsibleManagerId: "m1",
  },
  {
    id: makeId<"DealId">("d2"),
    clientId: makeId<"ClientId">("c2") as ClientId,
    title: "Deal B",
    stage: "quote",
    responsibleManagerId: "m2",
  },
];

const mop = (id: string): Viewer => ({ id, role: "mop" });
const tech: Viewer = { id: "t1", role: "technologist" };

describe("listDeals", () => {
  it("a sales manager sees only their own deals", async () => {
    const listDeals = makeListDeals({ deals: new InMemoryDealRepository(deals) });
    const result = await listDeals(mop("m2"));

    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Deal B");
  });

  it("a technologist sees the shared queue (all deals)", async () => {
    const listDeals = makeListDeals({ deals: new InMemoryDealRepository(deals) });
    expect(await listDeals(tech)).toHaveLength(2);
  });
});
