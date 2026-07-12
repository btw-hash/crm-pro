import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import { analyzeAssortment, type AssortmentTrend } from "@/domain/sales/assortment";
import {
  collectSellersByProduct,
  PROMO_ACTION_LABELS,
  type PromoAction,
  suggestPromotions,
} from "@/domain/sales/promotion";

export interface PromoCandidateView {
  readonly productId: string;
  readonly productName: string;
  readonly category: string;
  readonly trend: AssortmentTrend;
  readonly monthsSinceLastSale: number | null;
  readonly currentStockUnits: number;
  readonly action: PromoAction;
  readonly actionLabel: string;
  /** Managers (ids) who previously sold the product — target their clients for the mailing. */
  readonly sellers: readonly string[];
}

export type GetAssortmentPromotions = () => Promise<readonly PromoCandidateView[]>;

/**
 * Promotion/mailing candidates (#214): items with weak turnover (dead/declining)
 * but still in stock — frozen cash. Suggests clearing out/promoting them + who
 * to target the mailing to (managers who sold it before). Numbers come
 * deterministically from the ERP (sales + stock), no AI.
 */
export function makeGetAssortmentPromotions(deps: {
  erp: ErpGateway;
  products: ProductRepository;
}): GetAssortmentPromotions {
  return async () => {
    const [orders, products] = await Promise.all([
      deps.erp.getSalesHistory(),
      deps.products.list(),
    ]);
    const rows = analyzeAssortment({ orders, products });
    const stockUnits = new Map<string, number>();
    await Promise.all(
      products.map(async (product) => {
        const level = await deps.erp.getStockLevel(product.id);
        if (level) stockUnits.set(product.id, level.freeQuantity);
      }),
    );
    const sellersByProduct = collectSellersByProduct(orders);
    return suggestPromotions({ rows, stockUnits, sellersByProduct }).map((candidate) => ({
      ...candidate,
      actionLabel: PROMO_ACTION_LABELS[candidate.action],
    }));
  };
}
