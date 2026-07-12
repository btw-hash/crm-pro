import { describe, expect, it } from "vitest";
import type { Client } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import type { Viewer } from "@/domain/shared/viewer";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { makeListClients } from "./list-clients";

function client(id: string, managerId: string): Client {
  return {
    id: makeId<"ClientId">(id),
    name: `Client ${id}`,
    type: "horeca",
    category: "B",
    responsibleManagerId: managerId,
  };
}

const clients: readonly Client[] = [
  client("c1", "manager-owens"),
  client("c2", "manager-grant"),
  client("c3", "manager-owens"),
];

function build() {
  return makeListClients({ clients: new InMemoryClientRepository(clients) });
}

describe("listClients", () => {
  it("a sales manager sees only their own clients", async () => {
    const result = await build()({ id: "manager-owens", role: "mop" });

    expect(result.map((c) => c.id)).toEqual(["c1", "c3"]);
  });

  it("a technologist sees all clients", async () => {
    const result = await build()({ id: "t1", role: "technologist" } satisfies Viewer);

    expect(result).toHaveLength(3);
  });
});
