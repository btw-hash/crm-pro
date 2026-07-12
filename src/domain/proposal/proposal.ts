import type { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";

/** One line item in a proposal. */
export interface ProposalLineItem {
  readonly productId: ProductId;
  readonly productName: string;
  readonly unit: string;
  /** Quantity in catalog units. */
  readonly quantity: number;
  /** Per-unit price; null — if not set in the ERP. */
  readonly unitPrice: Money | null;
  /** Line total = unitPrice × quantity; null — if there's no price. */
  readonly lineTotal: Money | null;
}

/**
 * Proposal grand total = the sum of lineTotal across all priced line items.
 * Returns null if no line item has a price.
 */
export function computeProposalTotal(
  lines: readonly { readonly lineTotal: Money | null }[],
): Money | null {
  let total: Money | null = null;
  for (const line of lines) {
    if (line.lineTotal !== null) {
      total = total === null ? line.lineTotal : total.add(line.lineTotal);
    }
  }
  return total;
}

/**
 * Proposal economics. Computed DETERMINISTICALLY from numbers a human entered
 * (output volume, defect rate before/after the trial). AI never invents these
 * numbers — it only drafts the accompanying text for a ready-made calculation.
 */
export interface ProposalEconomicsInput {
  /** The client's monthly finished-product output, in money. */
  readonly monthlyOutput: Money;
  /** Defect rate before the trial, %. */
  readonly defectBeforePercent: number;
  /** Defect rate after the trial (with our ingredient), %. */
  readonly defectAfterPercent: number;
}

export interface ProposalEconomics {
  /** How many percentage points the defect rate dropped by. */
  readonly defectReductionPercent: number;
  readonly savingsPerMonth: Money;
  readonly savingsPerYear: Money;
}

export class ProposalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProposalValidationError";
  }
}

/** Savings = monthly output × defect-rate reduction. Year = ×12. */
export function computeEconomics(input: ProposalEconomicsInput): ProposalEconomics {
  const { defectBeforePercent: before, defectAfterPercent: after } = input;
  for (const value of [before, after]) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      throw new ProposalValidationError("The defect rate must be in the 0-100 range.");
    }
  }
  if (after > before) {
    throw new ProposalValidationError(
      "The defect rate after the trial can't be higher than before it.",
    );
  }
  const defectReductionPercent = before - after;
  const savingsPerMonth = input.monthlyOutput.multiply(defectReductionPercent / 100);
  return {
    defectReductionPercent,
    savingsPerMonth,
    savingsPerYear: savingsPerMonth.multiply(12),
  };
}
