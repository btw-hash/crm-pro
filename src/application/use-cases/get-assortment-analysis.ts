import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import {
  analyzeAssortment,
  ASSORTMENT_ACTION_LABELS,
  type AssortmentTrend,
} from "@/domain/sales/assortment";
import { Money } from "@/domain/pricing/money";

export interface AssortmentRowView {
  readonly productId: string;
  readonly productName: string;
  readonly category: string;
  readonly revenue: string;
  readonly units: number;
  readonly marginPercent: number;
  readonly grossMargin: string;
  readonly monthsSinceLastSale: number | null;
  readonly trend: AssortmentTrend;
  readonly actionLabel: string;
  readonly valueRank: number;
}

export type GetAssortmentAnalysis = () => Promise<readonly AssortmentRowView[]>;

/**
 * Assortment sales analysis (#177) for the category manager: stop/hold/grow
 * signals by trend + a ranking by gross margin (money × margin, not units).
 * Numbers are deterministic from sales history (via `ErpGateway`); the AI is
 * not involved — prices/revenue never leave the internal boundary
 * (guardrail #179).
 */
export function makeGetAssortmentAnalysis(deps: {
  erp: ErpGateway;
  products: ProductRepository;
}): GetAssortmentAnalysis {
  return async () => {
    const [orders, products] = await Promise.all([
      deps.erp.getSalesHistory(),
      deps.products.list(),
    ]);
    return analyzeAssortment({ orders, products }).map((row) => ({
      productId: row.productId,
      productName: row.productName,
      category: row.category,
      revenue: Money.of(row.revenueLast3Minor).format(),
      units: row.unitsLast3,
      marginPercent: row.marginPercent,
      grossMargin: Money.of(row.grossMarginLast3Minor).format(),
      monthsSinceLastSale: row.monthsSinceLastSale,
      trend: row.trend,
      actionLabel: ASSORTMENT_ACTION_LABELS[row.trend],
      valueRank: row.valueRank,
    }));
  };
}
