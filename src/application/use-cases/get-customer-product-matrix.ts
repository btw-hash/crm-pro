import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import { buildProductMatrix, type ProductTrend } from "@/domain/sales/product-matrix";

export interface ProductMatrixRowView {
  readonly productName: string;
  readonly trend: ProductTrend;
  readonly lastOrderMonth: string;
  readonly monthsSinceLast: number;
  readonly last3Revenue: string;
}

export interface CustomerProductMatrix {
  /** The "current" reference month (the latest one in the overall history). */
  readonly referenceMonth: string;
  readonly rows: readonly ProductMatrixRowView[];
}

export type GetCustomerProductMatrix = (input: {
  clientId: ClientId;
}) => Promise<CustomerProductMatrix>;

/**
 * The client's per-product purchase matrix (trend + last order). Recency is
 * measured from the latest month in the OVERALL history (so a "lapsed" SKU is
 * shown relative to the current moment, not the client's own last order).
 * Numbers come from ERP history.
 */
export function makeGetCustomerProductMatrix(deps: {
  erp: ErpGateway;
  products: ProductRepository;
}): GetCustomerProductMatrix {
  return async ({ clientId }) => {
    const [allOrders, products] = await Promise.all([
      deps.erp.getSalesHistory(),
      deps.products.list(),
    ]);
    const referenceMonth = allOrders.reduce((max, order) => {
      const month = order.orderedAt.slice(0, 7);
      return month > max ? month : max;
    }, "");
    const clientOrders = allOrders.filter((order) => order.clientId === clientId);
    const productName = new Map<string, string>(products.map((p) => [p.id, p.name]));
    const matrix = buildProductMatrix(clientOrders, referenceMonth || "2026-01");

    return {
      referenceMonth: referenceMonth || "—",
      rows: matrix.map((row) => ({
        productName: productName.get(row.productId) ?? row.productId,
        trend: row.trend,
        lastOrderMonth: row.lastOrderMonth,
        monthsSinceLast: row.monthsSinceLast,
        last3Revenue: Money.of(row.last3RevenueMinor).format(),
      })),
    };
  };
}
