import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { createPurchaseReceipt, type PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import { makeId } from "@/domain/shared/id";

/**
 * Deterministic generator of synthetic PURCHASE history (~12 months) — goods received
 * from suppliers. For purchasing analysis (#178): purchased ↔ sold/consumed. No
 * `Math.random` (stable across demo runs). Simulates an ERP export; the real one is
 * `getPurchaseHistory`.
 */

const MONTH_COUNT = 12; // 2025-07 .. 2026-06

function months(): string[] {
  const out: string[] = [];
  let year = 2025;
  let month = 7;
  for (let i = 0; i < MONTH_COUNT; i += 1) {
    out.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return out;
}

export interface PurchasePattern {
  readonly productId: ProductId;
  readonly supplierName: string;
  /** Base receipt amount per month, $. */
  readonly base: number;
  /** Average purchase price per unit, $ (units = amount/price). */
  readonly unitPriceUsd: number;
  readonly trend?: "stable" | "declining" | "growing";
}

function amountForMonth(p: PurchasePattern, i: number): number {
  const wobble = 1 + ((i % 3) - 1) * 0.05;
  const trend = p.trend ?? "stable";
  if (trend === "declining") {
    const factor = Math.max(0, 1 - i * 0.14);
    return factor < 0.15 ? 0 : Math.round((p.base * factor) / 10) * 10;
  }
  if (trend === "growing") {
    return Math.round((p.base * (1 + i * 0.05) * wobble) / 10) * 10;
  }
  return Math.round((p.base * wobble) / 10) * 10;
}

export function generatePurchaseHistory(patterns: readonly PurchasePattern[]): PurchaseReceipt[] {
  const labels = months();
  const receipts: PurchaseReceipt[] = [];
  let counter = 0;
  for (const p of patterns) {
    for (let i = 0; i < labels.length; i += 1) {
      const amount = amountForMonth(p, i);
      if (amount <= 0) continue;
      const month = labels[i] ?? "2026-01";
      counter += 1;
      receipts.push(
        createPurchaseReceipt({
          id: makeId<"PurchaseReceiptId">(`pur-${counter}`),
          supplierName: p.supplierName,
          receivedAt: `${month}-05T00:00:00.000Z`,
          lines: [
            {
              productId: p.productId,
              quantity: Math.max(1, Math.round(amount / p.unitPriceUsd)),
              amount: Money.dollars(amount),
            },
          ],
        }),
      );
    }
  }
  return receipts;
}
