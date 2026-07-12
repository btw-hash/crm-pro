import { describe, expect, it } from "vitest";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { makeCreateClient, ClientValidationError } from "./create-client";
import { makeUpdateClient } from "./update-client";
import { makeId } from "@/domain/shared/id";

async function setup() {
  const repo = new InMemoryClientRepository([]);
  const createClient = makeCreateClient({ clients: repo });
  const updateClient = makeUpdateClient({ clients: repo });
  const existing = await createClient({ name: "Amber Bakery", responsibleManagerId: "m1" });
  return { repo, updateClient, existing };
}

describe("updateClient use-case", () => {
  it("updates the client's name", async () => {
    const { repo, updateClient, existing } = await setup();
    const updated = await updateClient({
      id: existing.id,
      name: "New Bakery",
      type: existing.type,
      category: existing.category,
      responsibleManagerId: existing.responsibleManagerId,
    });
    expect(updated.name).toBe("New Bakery");
    const fromRepo = await repo.findById(existing.id);
    expect(fromRepo?.name).toBe("New Bakery");
  });

  it("updates the category and type", async () => {
    const { updateClient, existing } = await setup();
    const updated = await updateClient({
      id: existing.id,
      name: existing.name,
      type: "horeca",
      category: "A",
      responsibleManagerId: existing.responsibleManagerId,
    });
    expect(updated.type).toBe("horeca");
    expect(updated.category).toBe("A");
  });

  it("updates the optional city and EIN fields", async () => {
    const { updateClient, existing } = await setup();
    const updated = await updateClient({
      id: existing.id,
      name: existing.name,
      type: existing.type,
      category: existing.category,
      responsibleManagerId: existing.responsibleManagerId,
      city: "Salem",
      ein: "39-0123456",
    });
    expect(updated.city).toBe("Salem");
    expect(updated.ein).toBe("39-0123456");
  });

  it("clears optional fields on an empty string", async () => {
    const { updateClient, existing } = await setup();
    const updated = await updateClient({
      id: existing.id,
      name: existing.name,
      type: existing.type,
      category: existing.category,
      responsibleManagerId: existing.responsibleManagerId,
      city: "",
      ein: "",
    });
    expect(updated.city).toBeUndefined();
    expect(updated.ein).toBeUndefined();
  });

  it("throws ClientValidationError for an empty name", async () => {
    const { updateClient, existing } = await setup();
    await expect(
      updateClient({
        id: existing.id,
        name: "   ",
        type: existing.type,
        category: existing.category,
        responsibleManagerId: existing.responsibleManagerId,
      }),
    ).rejects.toBeInstanceOf(ClientValidationError);
  });

  it("throws ClientValidationError for a non-existent client", async () => {
    const { updateClient, existing } = await setup();
    await expect(
      updateClient({
        id: makeId<"ClientId">("client-nonexistent"),
        name: existing.name,
        type: existing.type,
        category: existing.category,
        responsibleManagerId: existing.responsibleManagerId,
      }),
    ).rejects.toBeInstanceOf(ClientValidationError);
  });

  it("doesn't change other clients in the repository", async () => {
    const repo = new InMemoryClientRepository([]);
    const createClient = makeCreateClient({ clients: repo });
    const updateClient = makeUpdateClient({ clients: repo });
    const a = await createClient({ name: "Client A", responsibleManagerId: "m1" });
    const b = await createClient({ name: "Client B", responsibleManagerId: "m2" });
    await updateClient({
      id: a.id,
      name: "Client A Updated",
      type: a.type,
      category: a.category,
      responsibleManagerId: a.responsibleManagerId,
    });
    const bFromRepo = await repo.findById(b.id);
    expect(bFromRepo?.name).toBe("Client B");
  });
});
