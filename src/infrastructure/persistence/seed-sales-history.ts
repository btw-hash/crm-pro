import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { createSalesOrder, type SalesOrder } from "@/domain/sales/sales-order";
import { makeId } from "@/domain/shared/id";

/**
 * Deterministic generator of synthetic sales history (~12 months) with BUILT-IN
 * storylines for the demo: a stable A-client, a departing SKU (taper to zero), a
 * product switch (one drops off — another picks up). No real PII, no `Math.random`
 * (stable across demo runs). Simulates an ERP export; real history goes through
 * `ErpGateway.getSalesHistory` (adapter only).
 */

const MONTH_COUNT = 12; // 2025-07 .. 2026-06

/** Month labels "YYYY-MM" in order (fixed — a stable demo). */
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

type Trend = "stable" | "growing" | "declining" | "out-by" | "in-from";

interface BuyingPattern {
  readonly clientId: ClientId;
  readonly managerId: string;
  readonly productId: ProductId;
  /** Base order amount in dollars (per month). */
  readonly base: number;
  readonly trend: Trend;
  /** For out-by — index of the last purchase month; for in-from — index of the first. */
  readonly pivot?: number;
  /** Average price per unit, $ (for units = amount/price). Defaults to 10. A low
   *  price → many units at little money (a counter-example to naive ABC by volume). */
  readonly unitPriceUsd?: number;
}

/** Order amount for a given month (0 — no order). Deterministic by trend and index. */
function amountForMonth(p: BuyingPattern, i: number, n: number): number {
  const wobble = 1 + ((i % 3) - 1) * 0.04; // ±4% "breathing", no randomness
  switch (p.trend) {
    case "stable":
      return round(p.base * wobble);
    case "growing":
      return round(p.base * (1 + i * 0.05) * wobble);
    case "declining": {
      // linear decline to zero by the end of the period — last order is in the past
      const factor = Math.max(0, 1 - i * 0.16);
      return factor < 0.15 ? 0 : round(p.base * factor);
    }
    case "out-by":
      return i <= (p.pivot ?? n) ? round(p.base * wobble) : 0;
    case "in-from":
      return i >= (p.pivot ?? 0) ? round(p.base * wobble) : 0;
    default:
      return 0;
  }
}

function round(rub: number): number {
  return Math.round(rub / 10) * 10;
}

/** Builds sales history from a set of buying patterns. */
export function generateSeedSalesOrders(patterns: readonly BuyingPattern[]): SalesOrder[] {
  const labels = months();
  const orders: SalesOrder[] = [];
  let counter = 0;
  for (const p of patterns) {
    for (let i = 0; i < labels.length; i += 1) {
      const amount = amountForMonth(p, i, labels.length);
      if (amount <= 0) continue;
      const month = labels[i] ?? "2026-01";
      counter += 1;
      orders.push(
        createSalesOrder({
          id: makeId<"SalesOrderId">(`so-${counter}`),
          clientId: p.clientId,
          managerId: p.managerId,
          orderedAt: `${month}-15T00:00:00.000Z`,
          // qty is derived roughly from amount and average price — good enough for a
          // demo (real units come from the ERP)
          lines: [
            {
              productId: p.productId,
              quantity: Math.max(1, Math.round(amount / (p.unitPriceUsd ?? 10))),
              amount: Money.dollars(amount),
            },
          ],
        }),
      );
    }
  }
  return orders;
}
