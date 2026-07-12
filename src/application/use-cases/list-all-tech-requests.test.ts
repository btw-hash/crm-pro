import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { createTechRequest, takeInWork, complete } from "@/domain/tech-request/tech-request";
import { InMemoryTechRequestRepository } from "@/infrastructure/persistence/in-memory-tech-request-repository";
import { makeListAllTechRequests } from "./list-tech-requests";

const dealId = makeId<"DealId">("d1");
const clientId = makeId<"ClientId">("c1");

function makeReq(id: string, status: "open" | "in_progress" | "done" = "open") {
  let req = createTechRequest({
    id: makeId<"TechRequestId">(id),
    dealId,
    clientId,
    kind: "test",
    note: "Product test",
    requestedBy: "manager-x",
    createdAt: `2026-06-24T0${id}:00:00Z`,
  });
  if (status === "in_progress" || status === "done") {
    req = takeInWork(req, "tech-kent");
  }
  if (status === "done") {
    req = complete(req);
  }
  return req;
}

describe("listAllTechRequests", () => {
  it("returns requests of all statuses", async () => {
    const repo = new InMemoryTechRequestRepository([
      makeReq("1", "open"),
      makeReq("2", "in_progress"),
      makeReq("3", "done"),
    ]);
    const useCase = makeListAllTechRequests({ techRequests: repo });
    const result = await useCase();
    expect(result).toHaveLength(3);
    const statuses = result.map((r) => r.status);
    expect(statuses).toContain("open");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("done");
  });

  it("returns an empty array if there are no requests", async () => {
    const repo = new InMemoryTechRequestRepository([]);
    const useCase = makeListAllTechRequests({ techRequests: repo });
    const result = await useCase();
    expect(result).toHaveLength(0);
  });

  it("includes done requests that listActive does not return", async () => {
    const doneReq = makeReq("5", "done");
    const repo = new InMemoryTechRequestRepository([doneReq]);
    const listAll = makeListAllTechRequests({ techRequests: repo });
    const all = await listAll();
    expect(all.some((r) => r.status === "done")).toBe(true);
    // listActive filters out done requests
    const active = await repo.listActive();
    expect(active.some((r) => r.status === "done")).toBe(false);
  });
});
