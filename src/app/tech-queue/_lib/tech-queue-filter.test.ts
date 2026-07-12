import { describe, expect, it } from "vitest";
import type { TechRequest } from "@/domain/tech-request/tech-request";
import { filterTechRequests, matchesTechQueueFilter, toTechQueueFilter } from "./tech-queue-filter";

function req(partial: Pick<TechRequest, "status" | "kind">): Pick<TechRequest, "status" | "kind"> {
  return partial;
}

const sample = [
  req({ status: "open", kind: "consult" }),
  req({ status: "open", kind: "demo" }),
  req({ status: "in_progress", kind: "audit_req" }),
  req({ status: "in_progress", kind: "demo" }),
];

describe("toTechQueueFilter", () => {
  it("keeps valid values", () => {
    expect(toTechQueueFilter("open")).toBe("open");
    expect(toTechQueueFilter("demo")).toBe("demo");
  });
  it("falls back to 'all' for an empty/unknown value", () => {
    expect(toTechQueueFilter(undefined)).toBe("all");
    expect(toTechQueueFilter("garbage")).toBe("all");
  });
});

describe("matchesTechQueueFilter", () => {
  it("all passes everything", () => {
    expect(matchesTechQueueFilter(req({ status: "done", kind: "audit_req" }), "all")).toBe(true);
  });
  it("open — only status open", () => {
    expect(matchesTechQueueFilter(req({ status: "open", kind: "consult" }), "open")).toBe(true);
    expect(matchesTechQueueFilter(req({ status: "in_progress", kind: "consult" }), "open")).toBe(
      false,
    );
  });
  it("demo — only kind demo, any status", () => {
    expect(matchesTechQueueFilter(req({ status: "open", kind: "demo" }), "demo")).toBe(true);
    expect(matchesTechQueueFilter(req({ status: "open", kind: "consult" }), "demo")).toBe(false);
  });
});

describe("filterTechRequests", () => {
  it("all → all 4", () => {
    expect(filterTechRequests(sample, "all")).toHaveLength(4);
  });
  it("open → 2", () => {
    expect(filterTechRequests(sample, "open")).toHaveLength(2);
  });
  it("in_progress → 2", () => {
    expect(filterTechRequests(sample, "in_progress")).toHaveLength(2);
  });
  it("demo → 2 (by kind, regardless of status)", () => {
    expect(filterTechRequests(sample, "demo")).toHaveLength(2);
  });
});
