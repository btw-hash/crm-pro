import { describe, expect, it } from "vitest";
import { Money } from "@/domain/pricing/money";
import { makeId } from "@/domain/shared/id";
import {
  availableCredit,
  type ClientBalance,
  isOverCreditLimit,
  wouldExceedCreditLimit,
} from "./client-balance";

function balance(debt: number, limit: number): ClientBalance {
  return {
    clientId: makeId<"ClientId">("c1"),
    debt: Money.dollars(debt),
    creditLimit: Money.dollars(limit),
  };
}

describe("client balance", () => {
  it("computes the available credit remaining (limit − debt)", () => {
    expect(availableCredit(balance(3_000, 10_000)).amountMinor).toBe(700_000);
  });

  it("within the limit — not exceeded", () => {
    expect(isOverCreditLimit(balance(3_000, 10_000))).toBe(false);
  });

  it("debt greater than the limit — exceeded", () => {
    expect(isOverCreditLimit(balance(9_500, 5_000))).toBe(true);
  });

  it("debt exactly equal to the limit — still not exceeded", () => {
    expect(isOverCreditLimit(balance(5_000, 5_000))).toBe(false);
  });

  describe("wouldExceedCreditLimit", () => {
    it("order within the available credit — does not exceed the limit", () => {
      // available $7,000, order $5,000 → ok
      expect(wouldExceedCreditLimit(balance(3_000, 10_000), Money.dollars(5_000))).toBe(false);
    });

    it("order greater than the available credit — exceeds the limit", () => {
      // available $7,000, order $8,000 → exceeds
      expect(wouldExceedCreditLimit(balance(3_000, 10_000), Money.dollars(8_000))).toBe(true);
    });

    it("order exactly equal to the available credit — still within the limit", () => {
      expect(wouldExceedCreditLimit(balance(3_000, 10_000), Money.dollars(7_000))).toBe(false);
    });

    it("client already over the limit — any order exceeds the limit", () => {
      expect(wouldExceedCreditLimit(balance(9_500, 5_000), Money.dollars(100))).toBe(true);
    });
  });
});
