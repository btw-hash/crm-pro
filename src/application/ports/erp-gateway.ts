import type { ClientId } from "@/domain/client/client";
import type { ClientBalance } from "@/domain/client/client-balance";
import type { IndividualPrice } from "@/domain/pricing/price";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { NomenclatureItem, ProductId } from "@/domain/product/product";
import type { PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import type { SalesOrder } from "@/domain/sales/sales-order";

/** Sales history export filter (optionally by client). */
export interface SalesHistoryFilter {
  readonly clientId?: ClientId;
}

export interface CustomerOrderLine {
  readonly productId: ProductId;
  readonly quantity: number;
}

export interface CustomerOrderDraft {
  readonly clientId: ClientId;
  readonly lines: readonly CustomerOrderLine[];
  /**
   * Shipment date (ISO `yyyy-mm-dd`). Required: the ERP won't post a "Customer
   * order" without a shipment date.
   */
  readonly shipmentDate: string;
  /**
   * Idempotency key — stable for a given pair (deal + intent). A repeat call with
   * the same key does NOT create a second document, it returns the one already
   * created (`idempotent: true`). Prevents duplicate orders on network retries
   * (ADR-0002 §3). Format: `order:<dealId>` — one order per won deal.
   */
  readonly idempotencyKey: string;
}

export interface CustomerOrderResult {
  /** "Customer order" number in the ERP. */
  readonly orderNumber: string;
  /** true — the order already existed for this key (retry, no duplicate created). */
  readonly idempotent: boolean;
}

/** Reason the ERP refused to write. Error model for `createCustomerOrder` (ADR-0006). */
export type ErpWriteFailureReason =
  | "missing_required_field" // a required field wasn't filled in (e.g. shipment date)
  | "rejected_by_erp" // the ERP rejected the document (business rule/posting failure)
  | "unavailable"; // the ERP is unavailable (network/write service)

/**
 * ERP write error. We make write failures loud (never a silent catch, A18): the
 * calling layer distinguishes the reasons via `reason` and shows them to the user.
 */
export class ErpWriteError extends Error {
  constructor(
    readonly reason: ErpWriteFailureReason,
    message: string,
  ) {
    super(message);
    this.name = "ErpWriteError";
  }
}

export interface StockReservationOk {
  readonly ok: true;
  readonly reservedQuantity: number;
  /** Free stock AFTER the reservation. */
  readonly remainingFree: number;
  readonly unit: string;
}

export interface StockReservationFailure {
  readonly ok: false;
  /** How much is available right now (0 — if the item isn't in stock). */
  readonly available: number;
  readonly unit: string | null;
}

export type StockReservationResult = StockReservationOk | StockReservationFailure;

/**
 * Boundary with the ERP. The single point through which the application
 * reads prices/stock and creates orders. Implementations: StubErpGateway (seed
 * data) and ODataErpGateway (real ERP) — swappable without changing use-cases.
 */
export interface ErpGateway {
  /**
   * Nomenclature catalog from the ERP — the source for the catalog's product list
   * (1000+ items). The catalog isn't "baked into" the CRM: it's populated by the
   * sync {@link makeSyncNomenclature} into the local DB (not realtime). Stock/price
   * are fetched separately per item.
   */
  listNomenclature(): Promise<readonly NomenclatureItem[]>;
  getIndividualPrice(clientId: ClientId, productId: ProductId): Promise<IndividualPrice | null>;
  getStockLevel(productId: ProductId): Promise<StockLevel | null>;
  /** Client's receivables and credit limit; null — if the balance isn't set up in the ERP. */
  getClientBalance(clientId: ClientId): Promise<ClientBalance | null>;
  /** Sales history (order facts) — the basis for analytics. Synthetic seed data in the demo. */
  getSalesHistory(filter?: SalesHistoryFilter): Promise<readonly SalesOrder[]>;
  /** Procurement history (goods receipts) — for procurement analysis (shortage/overstock). */
  getPurchaseHistory(): Promise<readonly PurchaseReceipt[]>;
  /** Reserves a test batch in the warehouse (deducts from the free stock). */
  reserveStock(productId: ProductId, quantity: number): Promise<StockReservationResult>;
  /**
   * Creates a "Customer order" in the ERP. Idempotent on `draft.idempotencyKey`
   * (a retry doesn't create a duplicate). Throws {@link ErpWriteError} on ERP refusal.
   */
  createCustomerOrder(draft: CustomerOrderDraft): Promise<CustomerOrderResult>;
}
