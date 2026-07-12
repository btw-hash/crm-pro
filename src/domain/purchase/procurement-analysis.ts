import type { Product } from "@/domain/product/product";
import type { PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import type { SalesOrder } from "@/domain/sales/sales-order";

/** Procurement signal for an item. */
export type ProcurementSignal = "shortage" | "ok" | "overstock";

export const PROCUREMENT_ACTION_LABELS: Record<ProcurementSignal, string> = {
  shortage: "Buy more — depleting fast, stock is running out",
  ok: "Hold",
  overstock: "Reduce purchasing — overstocked, cash tied up",
};

export interface ProcurementRow {
  readonly productId: string;
  readonly productName: string;
  readonly category: string;
  readonly soldUnitsLast3: number;
  readonly boughtUnitsLast3: number;
  readonly boughtAmountLast3Minor: number;
  readonly currentStockUnits: number;
  /** Months of stock = balance / average monthly sales; null — no sales (stock is "permanent"). */
  readonly monthsOfStock: number | null;
  readonly signal: ProcurementSignal;
  /** Recommended purchase volume (units) to reach target coverage; 0 — not needed. */
  readonly recommendedBuyUnits: number;
}

// Thresholds (months of stock). Account for the SPEED of depletion, not just the current balance.
const SHORTAGE_MONTHS = 1.5; // lower — stock is running out, buy more
const OVERSTOCK_MONTHS = 4; // higher — sitting idle, reduce purchasing
const TARGET_MONTHS = 2; // target coverage for the buy-more recommendation

function monthIndex(month: string): number {
  const [y, m] = month.split("-");
  return Number(y) * 12 + (Number(m) - 1);
}

const SIGNAL_RANK: Record<ProcurementSignal, number> = { shortage: 0, overstock: 1, ok: 2 };

/**
 * Procurement analysis for the category manager: compares purchased ↔ sold/depleted over
 * the last 3 months and the current balance → a buy-more/hold/reduce signal. The key metric
 * is MONTHS OF STOCK (balance ÷ depletion speed), not the raw balance. For a shortage it
 * computes the recommended purchase volume. Numbers come from the ERP deterministically, AI
 * is not involved.
 */
export function analyzeProcurement(input: {
  sales: readonly SalesOrder[];
  purchases: readonly PurchaseReceipt[];
  stockUnits: ReadonlyMap<string, number>;
  products: readonly Product[];
  referenceMonth?: string;
}): readonly ProcurementRow[] {
  const { sales, purchases, stockUnits, products } = input;

  let maxMonth = input.referenceMonth ?? "";
  const soldByProduct = new Map<string, Map<string, number>>();
  for (const order of sales) {
    const month = order.orderedAt.slice(0, 7);
    if (!input.referenceMonth && month > maxMonth) maxMonth = month;
    for (const line of order.lines) {
      const m = soldByProduct.get(line.productId) ?? new Map<string, number>();
      m.set(month, (m.get(month) ?? 0) + line.quantity);
      soldByProduct.set(line.productId, m);
    }
  }
  const boughtUnits = new Map<string, Map<string, number>>();
  const boughtAmount = new Map<string, Map<string, number>>();
  for (const receipt of purchases) {
    const month = receipt.receivedAt.slice(0, 7);
    if (!input.referenceMonth && month > maxMonth) maxMonth = month;
    for (const line of receipt.lines) {
      const u = boughtUnits.get(line.productId) ?? new Map<string, number>();
      u.set(month, (u.get(month) ?? 0) + line.quantity);
      boughtUnits.set(line.productId, u);
      const a = boughtAmount.get(line.productId) ?? new Map<string, number>();
      a.set(month, (a.get(month) ?? 0) + line.amount.amountMinor);
      boughtAmount.set(line.productId, a);
    }
  }
  const refIndex = maxMonth === "" ? 0 : monthIndex(maxMonth);
  const sumLast3 = (source: Map<string, number> | undefined): number => {
    if (!source) return 0;
    let sum = 0;
    for (const [month, value] of source) {
      const back = refIndex - monthIndex(month);
      if (back >= 0 && back <= 2) sum += value;
    }
    return sum;
  };

  const rows = products.map((product): ProcurementRow => {
    const soldUnitsLast3 = sumLast3(soldByProduct.get(product.id));
    const boughtUnitsLast3 = sumLast3(boughtUnits.get(product.id));
    const boughtAmountLast3Minor = sumLast3(boughtAmount.get(product.id));
    const currentStockUnits = stockUnits.get(product.id) ?? 0;
    const avgMonthlySold = soldUnitsLast3 / 3;
    const monthsOfStock =
      avgMonthlySold > 0 ? currentStockUnits / avgMonthlySold : currentStockUnits > 0 ? null : 0;

    let signal: ProcurementSignal;
    if (monthsOfStock === null || monthsOfStock >= OVERSTOCK_MONTHS) {
      // not selling while there's a balance OR stock covers many months — overstock
      signal = currentStockUnits > 0 ? "overstock" : "ok";
    } else if (monthsOfStock < SHORTAGE_MONTHS && soldUnitsLast3 > 0) {
      signal = "shortage";
    } else {
      signal = "ok";
    }

    const recommendedBuyUnits =
      signal === "shortage"
        ? Math.max(0, Math.round(TARGET_MONTHS * avgMonthlySold - currentStockUnits))
        : 0;

    return {
      productId: product.id,
      productName: product.name,
      category: product.kit?.category ?? "No category",
      soldUnitsLast3,
      boughtUnitsLast3,
      boughtAmountLast3Minor,
      currentStockUnits,
      monthsOfStock,
      signal,
      recommendedBuyUnits,
    };
  });

  return [...rows].sort(
    (a, b) =>
      SIGNAL_RANK[a.signal] - SIGNAL_RANK[b.signal] ||
      b.boughtAmountLast3Minor - a.boughtAmountLast3Minor,
  );
}
