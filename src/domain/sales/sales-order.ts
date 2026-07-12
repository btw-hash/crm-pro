import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import type { Id } from "@/domain/shared/id";

export type SalesOrderId = Id<"SalesOrderId">;

/** Order line: product, quantity, line amount (price × quantity). */
export interface SalesOrderLine {
  readonly productId: ProductId;
  readonly quantity: number;
  readonly amount: Money;
}

/**
 * A historical sale fact (customer order) — the basis for analytics: revenue,
 * trends, client×product matrix, recommendations. In the demo — a synthetic
 * seed; in production — an export from the ERP via `ErpGateway.getSalesHistory`
 * (only the adapter changes, not the logic).
 */
export interface SalesOrder {
  readonly id: SalesOrderId;
  readonly clientId: ClientId;
  /** Responsible manager at the time of the order (for a "by person" breakdown). */
  readonly managerId: string;
  readonly lines: readonly SalesOrderLine[];
  readonly total: Money;
  /** Order date (ISO) — for monthly/periodic breakdowns. */
  readonly orderedAt: string;
  /** Source deal, if the order was created from a won deal. */
  readonly sourceDealId?: DealId;
}

export class SalesOrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SalesOrderValidationError";
  }
}

/** Order total = sum of the lines (in a single currency). */
export function salesOrderTotal(lines: readonly SalesOrderLine[]): Money {
  return lines.reduce((sum, line) => sum.add(line.amount), Money.of(0));
}

export interface CreateSalesOrderInput {
  readonly id: SalesOrderId;
  readonly clientId: ClientId;
  readonly managerId: string;
  readonly lines: readonly SalesOrderLine[];
  readonly orderedAt: string;
  readonly sourceDealId?: DealId;
}

/** Creates an order with total computation and validation. Pure function, no side effects. */
export function createSalesOrder(input: CreateSalesOrderInput): SalesOrder {
  if (input.lines.length === 0) {
    throw new SalesOrderValidationError("The order must contain at least one line");
  }
  for (const line of input.lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new SalesOrderValidationError("Line quantity must be greater than zero");
    }
  }
  return {
    id: input.id,
    clientId: input.clientId,
    managerId: input.managerId,
    lines: input.lines,
    total: salesOrderTotal(input.lines),
    orderedAt: input.orderedAt,
    sourceDealId: input.sourceDealId,
  };
}
