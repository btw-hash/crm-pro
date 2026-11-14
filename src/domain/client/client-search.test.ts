import { describe, expect, it } from "vitest";
import { matchesClientQuery, normalizeClientQuery } from "./client-search";

describe("normalizeClientQuery", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeClientQuery("  Barry  ")).toBe("barry");
    expect(normalizeClientQuery("NOIRELLE")).toBe("noirelle");
  });

  it("empty/whitespace/undefined → empty string", () => {
    expect(normalizeClientQuery("")).toBe("");
    expect(normalizeClientQuery("   ")).toBe("");
    expect(normalizeClientQuery(undefined)).toBe("");
    expect(normalizeClientQuery(null)).toBe("");
  });
});

describe("matchesClientQuery", () => {
  it("empty query passes everyone", () => {
    expect(matchesClientQuery("Barry Callebaut", "")).toBe(true);
    expect(matchesClientQuery("", "")).toBe(true);
  });

  it("substring match, case-insensitive", () => {
    expect(matchesClientQuery("Barry Callebaut", "barry")).toBe(true);
    expect(matchesClientQuery("Barry Callebaut", "calleba")).toBe(true);
    expect(matchesClientQuery("Victoria LLC", "victoria")).toBe(true);
  });

  it("no match → false", () => {
    expect(matchesClientQuery("Barry Callebaut", "sweettooth")).toBe(false);
  });

  it("the query is expected to be normalized (name case is honored, query's is not)", () => {
    // the name is lowercased internally, so uppercase in the name still matches
    expect(matchesClientQuery("NOIRELLE", "noirelle")).toBe(true);
  });
});
