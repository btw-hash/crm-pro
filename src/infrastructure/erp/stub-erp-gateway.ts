import type {
  CustomerOrderDraft,
  CustomerOrderResult,
  ErpGateway,
  SalesHistoryFilter,
  StockReservationResult,
} from "@/application/ports/erp-gateway";
import { ErpWriteError } from "@/application/ports/erp-gateway";
import type { ClientId } from "@/domain/client/client";
import type { ClientBalance } from "@/domain/client/client-balance";
import type { IndividualPrice } from "@/domain/pricing/price";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { NomenclatureItem, ProductId } from "@/domain/product/product";
import type { PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import type { SalesOrder } from "@/domain/sales/sales-order";

/** Stub ERP backed by seed data. Behavior matches the ErpGateway contract. */
export class StubErpGateway implements ErpGateway {
  private orderCounter = 0;
  /** Product reservations (demo): kept in memory, subtracted from free stock. */
  private readonly reserved = new Map<ProductId, number>();
  /** Order dedup by idempotency key — a repeat returns the same document. */
  private readonly placedOrders = new Map<string, CustomerOrderResult>();

  constructor(
    private readonly prices: readonly IndividualPrice[],
    private readonly stock: readonly StockLevel[],
    private readonly balances: readonly ClientBalance[] = [],
    private readonly salesOrders: readonly SalesOrder[] = [],
    private readonly purchases: readonly PurchaseReceipt[] = [],
    private readonly nomenclature: readonly NomenclatureItem[] = [],
  ) {}

  async listNomenclature(): Promise<readonly NomenclatureItem[]> {
    return this.nomenclature;
  }

  async getIndividualPrice(
    clientId: ClientId,
    productId: ProductId,
  ): Promise<IndividualPrice | null> {
    return this.prices.find((p) => p.clientId === clientId && p.productId === productId) ?? null;
  }

  async getStockLevel(productId: ProductId): Promise<StockLevel | null> {
    const level = this.stock.find((s) => s.productId === productId);
    if (!level) {
      return null;
    }
    // Free stock accounting for reserved test batches.
    return { ...level, freeQuantity: this.freeQuantity(level) };
  }

  async getClientBalance(clientId: ClientId): Promise<ClientBalance | null> {
    return this.balances.find((b) => b.clientId === clientId) ?? null;
  }

  async getSalesHistory(filter?: SalesHistoryFilter): Promise<readonly SalesOrder[]> {
    if (filter?.clientId) {
      return this.salesOrders.filter((order) => order.clientId === filter.clientId);
    }
    return this.salesOrders;
  }

  async getPurchaseHistory(): Promise<readonly PurchaseReceipt[]> {
    return this.purchases;
  }

  async reserveStock(productId: ProductId, quantity: number): Promise<StockReservationResult> {
    const level = this.stock.find((s) => s.productId === productId);
    if (!level) {
      return { ok: false, available: 0, unit: null };
    }
    const free = this.freeQuantity(level);
    if (quantity <= 0 || free < quantity) {
      return { ok: false, available: free, unit: level.unit };
    }
    this.reserved.set(productId, (this.reserved.get(productId) ?? 0) + quantity);
    return {
      ok: true,
      reservedQuantity: quantity,
      remainingFree: free - quantity,
      unit: level.unit,
    };
  }

  async createCustomerOrder(draft: CustomerOrderDraft): Promise<CustomerOrderResult> {
    if (!draft.shipmentDate) {
      throw new ErpWriteError(
        "missing_required_field",
        "ERP will not post a customer order without a shipment date.",
      );
    }
    // Idempotency: a repeat with the same key does not create a second document.
    const existing = this.placedOrders.get(draft.idempotencyKey);
    if (existing) {
      return { ...existing, idempotent: true };
    }
    this.orderCounter += 1;
    const result: CustomerOrderResult = {
      orderNumber: `STUB-${this.orderCounter}-${draft.lines.length}`,
      idempotent: false,
    };
    this.placedOrders.set(draft.idempotencyKey, result);
    return result;
  }

  private freeQuantity(level: StockLevel): number {
    return Math.max(0, level.freeQuantity - (this.reserved.get(level.productId) ?? 0));
  }
}
