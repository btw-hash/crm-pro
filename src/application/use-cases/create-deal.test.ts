import { describe, expect, it } from "vitest";
import type { Client } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import { DealValidationError } from "@/domain/deal/deal";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { ClientNotFoundError, makeCreateDeal } from "./create-deal";

const seedClient: Client = {
  id: makeId<"ClientId">("c1"),
  name: "Client",
  type: "industry",
  category: "A",
  responsibleManagerId: "m1",
};

function setup(clients: readonly Client[] = [seedClient]) {
  const dealsRepo = new InMemoryDealRepository([]);
  const clientsRepo = new InMemoryClientRepository(clients);
  const createDeal = makeCreateDeal({ deals: dealsRepo, clients: clientsRepo });
  return { dealsRepo, createDeal };
}

describe("createDeal use-case", () => {
  it("creates and saves a deal", async () => {
    const { dealsRepo, createDeal } = setup();
    const deal = await createDeal({
      clientId: makeId<"ClientId">("c1"),
      title: "Test",
      responsibleManagerId: "m1",
    });
    expect(deal.stage).toBe("qualification");
    expect(await dealsRepo.findById(deal.id)).not.toBeNull();
  });

  it("throws ClientNotFoundError for a nonexistent client", async () => {
    const { createDeal } = setup();
    await expect(
      createDeal({
        clientId: makeId<"ClientId">("missing"),
        title: "Test",
        responsibleManagerId: "m1",
      }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("propagates DealValidationError for an empty title", async () => {
    const { createDeal } = setup();
    await expect(
      createDeal({ clientId: makeId<"ClientId">("c1"), title: "", responsibleManagerId: "m1" }),
    ).rejects.toBeInstanceOf(DealValidationError);
  });
});
