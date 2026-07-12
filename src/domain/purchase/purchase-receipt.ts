import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import type { Id } from "@/domain/shared/id";

export type PurchaseReceiptId = Id<"PurchaseReceiptId">;

/** A receipt line: product, quantity, the line's purchase cost. */
export interface PurchaseReceiptLine {
  readonly productId: ProductId;
  readonly quantity: number;
  readonly amount: Money;
}

/**
 * A historical PURCHASE fact (goods receipt from a supplier) — the basis for procurement
 * analysis: comparing purchased ↔ sold/depleted, shortage/overstock. In the demo it's a
 * synthetic seed; in production it's an export from the ERP via
 * `ErpGateway.getPurchaseHistory` (the adapter changes).
 */
export interface PurchaseReceipt {
  readonly id: PurchaseReceiptId;
  readonly supplierName: string;
  readonly lines: readonly PurchaseReceiptLine[];
  readonly total: Money;
  /** Receipt date (ISO) — for monthly/period breakdowns. */
  readonly receivedAt: string;
}

export class PurchaseReceiptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PurchaseReceiptValidationError";
  }
}

export function purchaseReceiptTotal(lines: readonly PurchaseReceiptLine[]): Money {
  return lines.reduce((sum, line) => sum.add(line.amount), Money.of(0));
}

export interface CreatePurchaseReceiptInput {
  readonly id: PurchaseReceiptId;
  readonly supplierName: string;
  readonly lines: readonly PurchaseReceiptLine[];
  readonly receivedAt: string;
}

/** Creates a receipt with the total computed and validated. A pure function. */
export function createPurchaseReceipt(input: CreatePurchaseReceiptInput): PurchaseReceipt {
  if (input.lines.length === 0) {
    throw new PurchaseReceiptValidationError("The receipt must contain at least one line");
  }
  for (const line of input.lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new PurchaseReceiptValidationError("Line quantity must be greater than zero");
    }
  }
  return {
    id: input.id,
    supplierName: input.supplierName,
    lines: input.lines,
    total: purchaseReceiptTotal(input.lines),
    receivedAt: input.receivedAt,
  };
}
