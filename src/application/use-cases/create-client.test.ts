import { describe, expect, it } from "vitest";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { ClientValidationError, makeCreateClient } from "./create-client";

function setup() {
  const repo = new InMemoryClientRepository([]);
  const createClient = makeCreateClient({ clients: repo });
  return { repo, createClient };
}

describe("createClient use-case", () => {
  it("creates a client with the required fields", async () => {
    const { repo, createClient } = setup();
    const client = await createClient({ name: "New Bakery Co.", responsibleManagerId: "m1" });
    expect(client.name).toBe("New Bakery Co.");
    expect(client.type).toBe("retail");
    expect(client.category).toBe("C");
    expect(await repo.findById(client.id)).not.toBeNull();
  });

  it("saves the optional city and EIN fields", async () => {
    const { createClient } = setup();
    const client = await createClient({
      name: "Test",
      city: "Portland",
      ein: "39-0123456",
      responsibleManagerId: "m1",
    });
    expect(client.city).toBe("Portland");
    expect(client.ein).toBe("39-0123456");
  });

  it("trims whitespace in the name", async () => {
    const { createClient } = setup();
    const client = await createClient({ name: "  Bakery  ", responsibleManagerId: "m1" });
    expect(client.name).toBe("Bakery");
  });

  it("throws ClientValidationError for an empty name", async () => {
    const { createClient } = setup();
    await expect(createClient({ name: "   ", responsibleManagerId: "m1" })).rejects.toBeInstanceOf(
      ClientValidationError,
    );
  });

  it("does not save empty optional fields", async () => {
    const { createClient } = setup();
    const client = await createClient({
      name: "Test",
      city: "",
      ein: "",
      responsibleManagerId: "m1",
    });
    expect(client.city).toBeUndefined();
    expect(client.ein).toBeUndefined();
  });
});
