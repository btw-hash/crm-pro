import { describe, expect, it } from "vitest";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import {
  computeEconomics,
  computeProposalTotal,
  ProposalValidationError,
  type ProposalLineItem,
} from "./proposal";

const pid = (s: string) => makeId<"ProductId">(s) as ProductId;

function line(id: string, quantity: number, unitPrice: number | null): ProposalLineItem {
  const price = unitPrice !== null ? Money.dollars(unitPrice) : null;
  const lineTotal = price !== null ? price.multiply(quantity) : null;
  return {
    productId: pid(id),
    productName: `Product ${id}`,
    unit: "kg",
    quantity,
    unitPrice: price,
    lineTotal,
  };
}

describe("computeProposalTotal", () => {
  it("empty array → null", () => {
    expect(computeProposalTotal([])).toBeNull();
  });

  it("one priced line item → its lineTotal", () => {
    const total = computeProposalTotal([line("p1", 100, 4.5)]);
    // 4.5 × 100 = $450 → 45,000 cents
    expect(total?.amountMinor).toBe(45_000);
  });

  it("several priced line items → sum of lineTotals", () => {
    const total = computeProposalTotal([
      line("p1", 1000, 4.5), // $4,500
      line("p2", 500, 1.5), // $750
    ]);
    // total $5,250 → 525,000 cents
    expect(total?.amountMinor).toBe(525_000);
  });

  it("some line items without a price → only priced ones are summed", () => {
    const total = computeProposalTotal([
      line("p1", 1000, 4.5), // $4,500
      line("p2", 500, null), // no price
    ]);
    expect(total?.amountMinor).toBe(450_000);
  });

  it("all line items without a price → null", () => {
    const total = computeProposalTotal([line("p1", 100, null), line("p2", 200, null)]);
    expect(total).toBeNull();
  });
});

describe("computeEconomics", () => {
  it("computes savings = monthly output × defect-rate reduction", () => {
    const econ = computeEconomics({
      monthlyOutput: Money.dollars(30_000),
      defectBeforePercent: 5,
      defectAfterPercent: 0.2,
    });

    expect(econ.defectReductionPercent).toBeCloseTo(4.8);
    // $30,000 × 4.8% = $1,440/mo
    expect(econ.savingsPerMonth.amountMinor).toBe(144_000);
    expect(econ.savingsPerYear.amountMinor).toBe(144_000 * 12);
  });

  it("rejects a defect rate outside the 0-100 range", () => {
    expect(() =>
      computeEconomics({
        monthlyOutput: Money.dollars(1_000),
        defectBeforePercent: 120,
        defectAfterPercent: 0,
      }),
    ).toThrow(ProposalValidationError);
  });

  it("rejects a defect rate after the trial that's higher than before", () => {
    expect(() =>
      computeEconomics({
        monthlyOutput: Money.dollars(1_000),
        defectBeforePercent: 1,
        defectAfterPercent: 5,
      }),
    ).toThrow(ProposalValidationError);
  });
});
