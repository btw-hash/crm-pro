import { describe, expect, it } from "vitest";
import { Money } from "./money";

describe("Money", () => {
  it("creates money from a decimal amount and stores cents as an integer", () => {
    const m = Money.dollars(149.9);
    expect(m.amountMinor).toBe(14990);
  });

  it("formats as USD using the en-US locale", () => {
    expect(Money.dollars(149.9).format()).toContain("$149.90");
  });

  it("adds amounts of the same currency", () => {
    expect(Money.dollars(10).add(Money.dollars(5)).amountMinor).toBe(1500);
  });

  it("multiplies by a quantity", () => {
    expect(Money.dollars(10).multiply(3).amountMinor).toBe(3000);
  });

  it("compares amounts for equality", () => {
    expect(Money.dollars(10).equals(Money.of(1000))).toBe(true);
  });

  it("rejects fractional cents", () => {
    expect(() => Money.of(10.5)).toThrow();
  });
});
