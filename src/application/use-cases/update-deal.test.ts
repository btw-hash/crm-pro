import { describe, expect, it } from "vitest";
import type { Client } from "@/domain/client/client";
import { DealValidationError } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { ClientNotFoundError } from "./create-deal";
import { makeUpdateDeal } from "./update-deal";
import type { Deal } from "@/domain/deal/deal";

const seedClient: Client = {
  id: makeId<"ClientId">("c1"),
  name: "Client",
  type: "industry",
  category: "A",
  responsibleManagerId: "m1",
};

const seedDeal: Deal = {
  id: makeId<"DealId">("d1"),
  clientId: makeId<"ClientId">("c1"),
  title: "Base deal",
  stage: "qualification",
  responsibleManagerId: "m1",
};

function setup(deals: readonly Deal[] = [seedDeal], clients: readonly Client[] = [seedClient]) {
  const dealsRepo = new InMemoryDealRepository(deals);
  const clientsRepo = new InMemoryClientRepository(clients);
  const updateDeal = makeUpdateDeal({ deals: dealsRepo, clients: clientsRepo });
  return { dealsRepo, updateDeal };
}

describe("updateDeal use-case", () => {
  it("updates title and saves", async () => {
    const { dealsRepo, updateDeal } = setup();
    await updateDeal({ dealId: makeId<"DealId">("d1"), title: "New title" });
    const saved = await dealsRepo.findById(makeId<"DealId">("d1"));
    expect(saved?.title).toBe("New title");
  });

  it("doesn't change the stage when updating", async () => {
    const { updateDeal } = setup();
    const updated = await updateDeal({ dealId: makeId<"DealId">("d1"), title: "Something" });
    expect(updated.stage).toBe("qualification");
  });

  it("throws DealNotFoundError for a non-existent deal", async () => {
    const { updateDeal } = setup();
    await expect(
      updateDeal({ dealId: makeId<"DealId">("missing"), title: "Test" }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });

  it("throws ClientNotFoundError when changing to a non-existent client", async () => {
    const { updateDeal } = setup();
    await expect(
      updateDeal({ dealId: makeId<"DealId">("d1"), clientId: makeId<"ClientId">("missing") }),
    ).rejects.toBeInstanceOf(ClientNotFoundError);
  });

  it("throws DealValidationError for an empty title", async () => {
    const { updateDeal } = setup();
    await expect(updateDeal({ dealId: makeId<"DealId">("d1"), title: "" })).rejects.toBeInstanceOf(
      DealValidationError,
    );
  });

  it("changes clientId when the client exists", async () => {
    const client2: Client = {
      id: makeId<"ClientId">("c2"),
      name: "Client 2",
      type: "retail",
      category: "B",
      responsibleManagerId: "m2",
    };
    const { updateDeal } = setup([seedDeal], [seedClient, client2]);
    const updated = await updateDeal({
      dealId: makeId<"DealId">("d1"),
      clientId: makeId<"ClientId">("c2"),
    });
    expect(updated.clientId).toBe(makeId<"ClientId">("c2"));
  });
});
