import type {
  CustomerOrderLine,
  CustomerOrderResult,
  ErpGateway,
} from "@/application/ports/erp-gateway";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import {
  availableCredit,
  type ClientBalance,
  wouldExceedCreditLimit,
} from "@/domain/client/client-balance";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import { DEAL_STAGE_LABELS, type DealStage } from "@/domain/deal/deal-stage";
import { Money } from "@/domain/pricing/money";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { type ShipmentLine } from "@/domain/shipment/shipment";
import { DealNotFoundError } from "./advance-deal-stage";

/** Minimal log sink (application doesn't depend on the infrastructure logger). */
interface OrderLogger {
  warn(message: string, meta?: Record<string, unknown>): void;
}

/**
 * The order would push the client over the credit limit (payment-deferral limit). Blocks
 * placing an order "on credit" deterministically (numbers from the ERP). Carries the
 * amounts for a clear message and UI.
 */
export class CreditLimitExceededError extends Error {
  readonly debt: Money;
  readonly creditLimit: Money;
  readonly available: Money;
  readonly orderTotal: Money;
  constructor(balance: ClientBalance, orderTotal: Money) {
    const available = availableCredit(balance);
    super(
      `Order for ${orderTotal.format()} exceeds the available deferral limit of ${available.format()} ` +
        `(debt ${balance.debt.format()} out of a limit of ${balance.creditLimit.format()}). ` +
        `Placing the order "on credit" is blocked.`,
    );
    this.name = "CreditLimitExceededError";
    this.debt = balance.debt;
    this.creditLimit = balance.creditLimit;
    this.available = available;
    this.orderTotal = orderTotal;
  }
}

/**
 * An order can be created only for a completed process (`stage=completed`). The
 * "Won/Lost" outcome no longer gates the order (#442 6d) — it's an optional
 * marker for win-rate analytics, not a precondition for the order.
 */
export class DealNotCompletedError extends Error {
  constructor(readonly stage: DealStage) {
    super(
      `A customer order can only be created for a completed process, but the deal is at the "${DEAL_STAGE_LABELS[stage]}" stage.`,
    );
    this.name = "DealNotCompletedError";
  }
}

export class CustomerOrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomerOrderValidationError";
  }
}

export interface PlaceCustomerOrderInput {
  readonly dealId: DealId;
  readonly lines: readonly CustomerOrderLine[];
  /** Shipment date (ISO `yyyy-mm-dd`) — required to post the order in the ERP. */
  readonly shipmentDate: string;
  /** Manual override of the credit-limit block (at the user's own risk; logged). */
  readonly allowOverLimit?: boolean;
  /** Id of the user placing the order — written to DealEvent. Defaults to "system". */
  readonly actorId?: string;
}

/**
 * Order total using the client's individual prices (price × quantity, from the ERP).
 * `null` — if some line has no price: then we don't check the limit (nothing to base the
 * total on).
 */
async function orderTotal(
  erp: ErpGateway,
  clientId: ClientId,
  lines: readonly CustomerOrderLine[],
): Promise<Money | null> {
  let total = Money.of(0);
  for (const line of lines) {
    const price = await erp.getIndividualPrice(clientId, line.productId);
    if (!price) return null;
    total = total.add(price.price.multiply(line.quantity));
  }
  return total;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type PlaceCustomerOrder = (input: PlaceCustomerOrderInput) => Promise<CustomerOrderResult>;

/**
 * Creates a "Customer order" in the ERP for a won deal. The line items are passed in
 * explicitly — `Deal` doesn't store them. The numbers/order creation happen on the ERP
 * side (through a port), never invented. The real ERP (`ODataErpGateway`) — behind an
 * anonymized copy (#1); logic and tests here run against a stub.
 *
 * After the order is successfully created in the ERP, a `Shipment` record is atomically
 * created with the initial status "placed" and linked to the process via `dealId`.
 * Shipment idempotency: a repeat call (idempotent=true) does not create a second
 * `Shipment`.
 */
export function makePlaceCustomerOrder(deps: {
  deals: DealRepository;
  erp: ErpGateway;
  shipments: ShipmentRepository;
  clients: ClientRepository;
  products: ProductRepository;
  events: DealEventRecorder;
  logger?: OrderLogger;
}): PlaceCustomerOrder {
  return async function placeCustomerOrder(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    if (deal.stage !== "completed") {
      throw new DealNotCompletedError(deal.stage);
    }
    if (input.lines.length === 0) {
      throw new CustomerOrderValidationError("Add at least one line to the order.");
    }
    for (const line of input.lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new CustomerOrderValidationError("Line quantity must be greater than zero.");
      }
    }
    if (!ISO_DATE.test(input.shipmentDate) || Number.isNaN(Date.parse(input.shipmentDate))) {
      throw new CustomerOrderValidationError("Provide a valid shipment date.");
    }
    // Credit discipline: can't sell "on credit" beyond the deferral limit. Numbers come
    // from the ERP (balance + individual prices), the decision is deterministic. If the
    // balance isn't set up or a line has no price — the total can't be determined, so the
    // limit isn't checked.
    const balance = await deps.erp.getClientBalance(deal.clientId);
    if (balance) {
      const total = await orderTotal(deps.erp, deal.clientId, input.lines);
      if (total && wouldExceedCreditLimit(balance, total)) {
        if (!input.allowOverLimit) {
          throw new CreditLimitExceededError(balance, total);
        }
        // Manual override — log it loudly (who/what/how much), the decision stays with the human.
        deps.logger?.warn("Order placed over the credit limit (manual override)", {
          dealId: input.dealId,
          clientId: deal.clientId,
          orderTotal: total.format(),
          available: availableCredit(balance).format(),
        });
      }
    }
    // One order per won deal: the key is stable → a retry doesn't create a duplicate.
    const result = await deps.erp.createCustomerOrder({
      clientId: deal.clientId,
      lines: input.lines,
      shipmentDate: input.shipmentDate,
      idempotencyKey: `order:${input.dealId}`,
    });

    // On an idempotent repeat the ERP returned an already-existing number — the Shipment
    // was already created on the first call; don't create a duplicate.
    if (!result.idempotent) {
      const [client, productEntries] = await Promise.all([
        deps.clients.findById(deal.clientId),
        Promise.all(
          input.lines.map(async (line) => ({
            line,
            product: await deps.products.findById(line.productId as ProductId),
          })),
        ),
      ]);

      const shipmentLines: ShipmentLine[] = productEntries.map(({ line, product }) => ({
        productName: product?.name ?? line.productId,
        quantity: line.quantity,
        unit: product?.unit ?? "kg",
        weightKg: 0,
      }));

      const address = client?.city ?? "—";

      await deps.shipments.save({
        id: makeId<"ShipmentId">(crypto.randomUUID()),
        clientId: deal.clientId,
        managerId: deal.responsibleManagerId,
        orderNumber: result.orderNumber,
        address,
        lines: shipmentLines,
        driver: null,
        scheduledDate: input.shipmentDate,
        status: "placed",
        dealId: input.dealId,
      });

      await deps.events.record({
        dealId: deal.id,
        type: "order_placed",
        summary: `Customer order #${result.orderNumber} placed → shipment created`,
        actor: input.actorId ?? "system",
      });
    }

    return result;
  };
}
