import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLIENT_FILTER,
  isClientFilter,
  matchesClientFilter,
  parseClientFilter,
  type ClientFilterFacts,
} from "./client-filter";

/** Base client facts; test cases override only the relevant fields. */
function facts(overrides: Partial<ClientFilterFacts> = {}): ClientFilterFacts {
  return { category: "B", isOverLimit: false, dealCount: 3, ...overrides };
}

describe("isClientFilter", () => {
  it("recognizes valid identifiers", () => {
    expect(isClientFilter("all")).toBe(true);
    expect(isClientFilter("key")).toBe(true);
    expect(isClientFilter("debtors")).toBe(true);
    expect(isClientFilter("new")).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isClientFilter("debtor")).toBe(false);
    expect(isClientFilter("")).toBe(false);
    expect(isClientFilter(undefined)).toBe(false);
    expect(isClientFilter(42)).toBe(false);
  });
});

describe("parseClientFilter", () => {
  it("returns the filter for a valid value", () => {
    expect(parseClientFilter("debtors")).toBe("debtors");
  });

  it("unknown/empty value → default filter (All)", () => {
    expect(parseClientFilter("xxx")).toBe(DEFAULT_CLIENT_FILTER);
    expect(parseClientFilter(undefined)).toBe("all");
  });
});

describe("matchesClientFilter", () => {
  it("all — passes any client", () => {
    expect(matchesClientFilter("all", facts({ category: "C", dealCount: 0 }))).toBe(true);
    expect(matchesClientFilter("all", facts({ category: "A", isOverLimit: true }))).toBe(true);
  });

  it("key — only high priority (category A)", () => {
    expect(matchesClientFilter("key", facts({ category: "A" }))).toBe(true);
    expect(matchesClientFilter("key", facts({ category: "B" }))).toBe(false);
    expect(matchesClientFilter("key", facts({ category: "C" }))).toBe(false);
  });

  it("debtors — only clients over the limit", () => {
    expect(matchesClientFilter("debtors", facts({ isOverLimit: true }))).toBe(true);
    expect(matchesClientFilter("debtors", facts({ isOverLimit: false }))).toBe(false);
  });

  it("new — only clients with no deals", () => {
    expect(matchesClientFilter("new", facts({ dealCount: 0 }))).toBe(true);
    expect(matchesClientFilter("new", facts({ dealCount: 1 }))).toBe(false);
  });

  it("signals are independent: a key debtor with deals is both key and debtors, but not new", () => {
    const keyDebtor = facts({ category: "A", isOverLimit: true, dealCount: 5 });
    expect(matchesClientFilter("key", keyDebtor)).toBe(true);
    expect(matchesClientFilter("debtors", keyDebtor)).toBe(true);
    expect(matchesClientFilter("new", keyDebtor)).toBe(false);
  });
});
