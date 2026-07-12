import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import { Money } from "@/domain/pricing/money";
import {
  analyzeProcurement,
  PROCUREMENT_ACTION_LABELS,
  type ProcurementSignal,
} from "@/domain/purchase/procurement-analysis";

export interface ProcurementRowView {
  readonly productId: string;
  readonly productName: string;
  readonly category: string;
  readonly soldUnits: number;
  readonly boughtUnits: number;
  readonly boughtAmount: string;
  readonly currentStock: number;
  readonly monthsOfStock: number | null;
  readonly signal: ProcurementSignal;
  readonly actionLabel: string;
  readonly recommendedBuyUnits: number;
}

export type GetProcurementAnalysis = () => Promise<readonly ProcurementRowView[]>;

/**
 * Procurement analysis (#178): matches purchased <-> sold/consumed volume and
 * current stock -> a buy-more/hold/reduce signal per item, factoring in the RATE
 * of consumption (months of stock). Numbers are deterministic from the ERP
 * (receipts/sales/stock), the AI is not involved (guard #179).
 */
export function makeGetProcurementAnalysis(deps: {
  erp: ErpGateway;
  products: ProductRepository;
}): GetProcurementAnalysis {
  return async () => {
    const [sales, purchases, products] = await Promise.all([
      deps.erp.getSalesHistory(),
      deps.erp.getPurchaseHistory(),
      deps.products.list(),
    ]);
    const stockUnits = new Map<string, number>();
    await Promise.all(
      products.map(async (product) => {
        const level = await deps.erp.getStockLevel(product.id);
        if (level) {
          stockUnits.set(product.id, level.freeQuantity);
        }
      }),
    );
    return analyzeProcurement({ sales, purchases, stockUnits, products }).map((row) => ({
      productId: row.productId,
      productName: row.productName,
      category: row.category,
      soldUnits: row.soldUnitsLast3,
      boughtUnits: row.boughtUnitsLast3,
      boughtAmount: Money.of(row.boughtAmountLast3Minor).format(),
      currentStock: row.currentStockUnits,
      monthsOfStock: row.monthsOfStock,
      signal: row.signal,
      actionLabel: PROCUREMENT_ACTION_LABELS[row.signal],
      recommendedBuyUnits: row.recommendedBuyUnits,
    }));
  };
}
