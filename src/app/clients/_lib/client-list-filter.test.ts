import { describe, expect, it } from "vitest";
import { CLIENT_FILTERS } from "@/domain/client/client-filter";
import type { Client, ClientId } from "@/domain/client/client";
import type { ClientCategory } from "@/domain/client/client-category";
import { countByFilter, selectVisibleClients, type ClientFilterSource } from "./client-list-filter";

function client(id: string, category: ClientCategory): Client {
  return {
    id: id as ClientId,
    name: `Client ${id}`,
    type: "distributor",
    category,
    responsibleManagerId: "mgr-1",
  };
}

function source(
  id: string,
  category: ClientCategory,
  isOverLimit: boolean,
  dealCount: number,
): ClientFilterSource {
  return { client: client(id, category), isOverLimit, dealCount };
}

// Fixture of 4 clients with different traits:
// c1 — key (A), with debt, with deals
// c2 — mid-size (B), with debt, with deals
// c3 — key (A), no debt, NO deals (new)
// c4 — mid-size (C), no debt, with deals
const sources: readonly ClientFilterSource[] = [
  source("c1", "A", true, 4),
  source("c2", "B", true, 2),
  source("c3", "A", false, 0),
  source("c4", "C", false, 5),
];

const ids = (rows: readonly { client: Client }[]): string[] => rows.map((r) => r.client.id);

describe("selectVisibleClients", () => {
  it("all — returns everyone in original order with original indexes", () => {
    const rows = selectVisibleClients(sources, "all");
    expect(ids(rows)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(rows.map((r) => r.index)).toEqual([0, 1, 2, 3]);
  });

  it("debtors — only clients over their limit", () => {
    expect(ids(selectVisibleClients(sources, "debtors"))).toEqual(["c1", "c2"]);
  });

  it("key — only high priority (category A)", () => {
    expect(ids(selectVisibleClients(sources, "key"))).toEqual(["c1", "c3"]);
  });

  it("new — only clients with no deals", () => {
    expect(ids(selectVisibleClients(sources, "new"))).toEqual(["c3"]);
  });

  it("keeps the original index even after filtering (for balances/avatar)", () => {
    const rows = selectVisibleClients(sources, "new");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.index).toBe(2); // c3 — third in the original list
  });

  it("empty segment → empty list", () => {
    const noDebtors = [source("x", "B", false, 1)];
    expect(selectVisibleClients(noDebtors, "debtors")).toEqual([]);
  });
});

describe("countByFilter", () => {
  it("counts using the same facts as filtering (count = result length)", () => {
    const counts = countByFilter(sources, CLIENT_FILTERS);
    expect(counts).toEqual({ all: 4, key: 2, debtors: 2, new: 1 });
    for (const filter of CLIENT_FILTERS) {
      expect(counts[filter]).toBe(selectVisibleClients(sources, filter).length);
    }
  });
});
