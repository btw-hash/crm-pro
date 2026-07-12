import {
  type CustomerOrderDraft,
  type CustomerOrderResult,
  ErpWriteError,
  type ErpGateway,
  type SalesHistoryFilter,
  type StockReservationResult,
} from "@/application/ports/erp-gateway";
import type { ClientId } from "@/domain/client/client";
import type { ClientBalance } from "@/domain/client/client-balance";
import { Money } from "@/domain/pricing/money";
import type { IndividualPrice } from "@/domain/pricing/price";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { NomenclatureItem, ProductId } from "@/domain/product/product";
import type { PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import type { SalesOrder } from "@/domain/sales/sales-order";
import { makeId } from "@/domain/shared/id";
import type { Logger } from "@/infrastructure/logging/logger";

export interface ODataErpConfig {
  readonly baseUrl: string;
  readonly username: string;
  readonly password: string;
}

const ODATA_PREFIX = "odata/standard.odata";

/** Rows of a single ERP OData response: `{ "odata.metadata": ..., "value": [...] }`. */
interface ODataList<T> {
  readonly value: readonly T[];
}

interface NomenclatureRow {
  readonly Ref_Key: string;
  readonly Code: string;
  readonly Sku?: string;
  readonly Description: string;
  readonly Unit?: string;
  readonly Barcode?: string;
  readonly ShelfLife?: string;
  readonly Packaging?: string;
}
interface PriceRow {
  readonly Price: number;
}
interface StockRow {
  readonly Product_Key: string;
  readonly FreeBalance: number;
  readonly Unit: string;
}
interface BalanceRow {
  readonly Debt: number;
  readonly CreditLimit: number;
}
interface DocLine {
  readonly Product_Key: string;
  readonly Quantity: number;
  readonly Amount: number;
}
interface SalesDoc {
  readonly Ref_Key: string;
  readonly Client_Key: string;
  readonly Manager: string;
  readonly DocumentTotal: number;
  readonly Date: string;
  readonly Lines: readonly DocLine[];
}
interface PurchaseDoc {
  readonly Ref_Key: string;
  readonly Supplier: string;
  readonly DocumentTotal: number;
  readonly Date: string;
  readonly Lines: readonly DocLine[];
}
interface OrderDoc {
  readonly Number: string;
}
interface ReservationResponse {
  readonly ok: boolean;
  readonly Reserved?: number;
  readonly FreeBalance?: number;
  readonly Available?: number;
  readonly Unit: string | null;
}

/**
 * Real ERP integration over OData/HTTP. The same implementation runs against
 * the demo copy (`tools/mock-erp`) and against a real ERP publication — only
 * `ERP_BASE_URL` changes. Endpoint contract — `specs/mock-erp-odata.md`. When
 * connecting a live base, entity/field names are re-checked against `$metadata`
 * (they may differ from the demo copy depending on configuration) — only this
 * adapter changes.
 */
export class ODataErpGateway implements ErpGateway {
  private readonly authHeader: string;

  constructor(
    private readonly config: ODataErpConfig,
    private readonly logger: Logger,
  ) {
    const token = Buffer.from(`${config.username}:${config.password}`).toString("base64");
    this.authHeader = `Basic ${token}`;
  }

  async listNomenclature(): Promise<readonly NomenclatureItem[]> {
    // Only real products: no groups, none marked for deletion. Field names
    // (Sku/Unit/Barcode) are re-checked against the live ERP's $metadata —
    // only this mapping changes then (same as the other adapter methods).
    const rows = await this.getList<NomenclatureRow>(
      "Catalog_Nomenclature",
      "DeletionMark eq false and IsFolder eq false",
    );
    return rows.map((r) => ({
      id: makeId<"ProductId">(r.Ref_Key),
      sku: r.Sku ?? r.Code,
      name: r.Description,
      unit: r.Unit ?? "",
      ...(r.Barcode ? { barcode: r.Barcode } : {}),
      ...(r.ShelfLife ? { shelfLife: r.ShelfLife } : {}),
      ...(r.Packaging ? { packaging: r.Packaging } : {}),
    }));
  }

  async getIndividualPrice(
    clientId: ClientId,
    productId: ProductId,
  ): Promise<IndividualPrice | null> {
    const rows = await this.getList<PriceRow>(
      "InformationRegister_ClientPrices",
      `Client_Key eq '${clientId}' and Product_Key eq '${productId}'`,
    );
    const row = rows[0];
    if (!row) return null;
    return { clientId, productId, price: Money.dollars(row.Price) };
  }

  async getStockLevel(productId: ProductId): Promise<StockLevel | null> {
    const rows = await this.getList<StockRow>(
      "AccumulationRegister_ProductBalances/Balance",
      `Product_Key eq '${productId}'`,
    );
    const row = rows[0];
    if (!row) return null;
    return { productId, freeQuantity: row.FreeBalance, unit: row.Unit };
  }

  async getClientBalance(clientId: ClientId): Promise<ClientBalance | null> {
    const rows = await this.getList<BalanceRow>(
      "AccumulationRegister_Settlements/Balance",
      `Client_Key eq '${clientId}'`,
    );
    const row = rows[0];
    if (!row) return null;
    return {
      clientId,
      debt: Money.dollars(row.Debt),
      creditLimit: Money.dollars(row.CreditLimit),
    };
  }

  async getSalesHistory(filter?: SalesHistoryFilter): Promise<readonly SalesOrder[]> {
    const odataFilter = filter?.clientId ? `Client_Key eq '${filter.clientId}'` : undefined;
    const docs = await this.getList<SalesDoc>("Document_GoodsAndServicesSales", odataFilter);
    return docs.map((d) => ({
      id: makeId<"SalesOrderId">(d.Ref_Key),
      clientId: makeId<"ClientId">(d.Client_Key),
      managerId: d.Manager,
      lines: d.Lines.map((t) => ({
        productId: makeId<"ProductId">(t.Product_Key),
        quantity: t.Quantity,
        amount: Money.dollars(t.Amount),
      })),
      total: Money.dollars(d.DocumentTotal),
      orderedAt: d.Date,
    }));
  }

  async getPurchaseHistory(): Promise<readonly PurchaseReceipt[]> {
    const docs = await this.getList<PurchaseDoc>("Document_GoodsAndServicesReceipt");
    return docs.map((d) => ({
      id: makeId<"PurchaseReceiptId">(d.Ref_Key),
      supplierName: d.Supplier,
      lines: d.Lines.map((t) => ({
        productId: makeId<"ProductId">(t.Product_Key),
        quantity: t.Quantity,
        amount: Money.dollars(t.Amount),
      })),
      total: Money.dollars(d.DocumentTotal),
      receivedAt: d.Date,
    }));
  }

  async reserveStock(productId: ProductId, quantity: number): Promise<StockReservationResult> {
    const body = await this.post<ReservationResponse>("Document_StockReservation", {
      Product_Key: productId,
      Quantity: quantity,
    });
    if (body.ok) {
      return {
        ok: true,
        reservedQuantity: body.Reserved ?? quantity,
        remainingFree: body.FreeBalance ?? 0,
        unit: body.Unit ?? "",
      };
    }
    return { ok: false, available: body.Available ?? 0, unit: body.Unit };
  }

  async createCustomerOrder(draft: CustomerOrderDraft): Promise<CustomerOrderResult> {
    // Idempotency the ERP way: first look for a document already posted with the
    // same key (a real ERP has no built-in idempotency — we ask for it explicitly).
    const existing = await this.getList<OrderDoc>(
      "Document_CustomerOrder",
      `IdempotencyKey eq '${draft.idempotencyKey}'`,
    );
    const found = existing[0];
    if (found) return { orderNumber: found.Number, idempotent: true };

    const created = await this.post<OrderDoc>(
      "Document_CustomerOrder",
      {
        Client_Key: draft.clientId,
        ShipmentDate: draft.shipmentDate,
        IdempotencyKey: draft.idempotencyKey,
        Lines: draft.lines.map((l) => ({
          Product_Key: l.productId,
          Quantity: l.quantity,
        })),
      },
      true,
    );
    return { orderNumber: created.Number, idempotent: false };
  }

  // ── HTTP ────────────────────────────────────────────────────────────────────
  private url(entity: string, odataFilter?: string): string {
    // Encode manually: space → %20 (not `+`), quotes → %27 — as the ERP's OData
    // expects (a `$filter` with `+` instead of a space may be rejected by a live ERP).
    const query = ["$format=json"];
    if (odataFilter) query.push(`$filter=${encodeURIComponent(odataFilter)}`);
    return `${this.config.baseUrl}/${ODATA_PREFIX}/${entity}?${query.join("&")}`;
  }

  private async getList<T>(entity: string, odataFilter?: string): Promise<readonly T[]> {
    const res = await this.fetchSafe(this.url(entity, odataFilter), { method: "GET" });
    if (!res.ok) {
      throw new Error(`ERP OData ${entity}: HTTP ${res.status}`);
    }
    const json = (await res.json()) as ODataList<T>;
    return json.value;
  }

  /**
   * POST of a document. `isWrite` marks write methods (orders): their failure is made
   * loud via {@link ErpWriteError} with a reason breakdown (A18, ADR-0006).
   */
  private async post<T>(entity: string, body: unknown, isWrite = false): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.url(entity), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: this.authHeader },
        body: JSON.stringify(body),
      });
    } catch (cause) {
      this.logger.warn("ERP OData unavailable", { entity });
      if (isWrite) throw new ErpWriteError("unavailable", `ERP unavailable: ${String(cause)}`);
      throw cause;
    }
    if (!res.ok) {
      if (isWrite) throw await this.toWriteError(entity, res);
      throw new Error(`ERP OData ${entity}: HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  private async toWriteError(entity: string, res: Response): Promise<ErpWriteError> {
    const code = await this.errorCode(res);
    if (res.status === 400 && code === "MISSING_REQUIRED_FIELD") {
      return new ErpWriteError(
        "missing_required_field",
        `ERP rejected ${entity}: a required field is not filled in.`,
      );
    }
    if (res.status >= 500) {
      return new ErpWriteError(
        "unavailable",
        `ERP unavailable (HTTP ${res.status}) while writing ${entity}.`,
      );
    }
    return new ErpWriteError(
      "rejected_by_erp",
      `ERP rejected ${entity} (HTTP ${res.status}, ${code ?? "?"}).`,
    );
  }

  private async errorCode(res: Response): Promise<string | null> {
    try {
      const json = (await res.json()) as { "odata.error"?: { code?: string } };
      return json["odata.error"]?.code ?? null;
    } catch {
      return null;
    }
  }

  private fetchSafe(url: string, init: RequestInit): Promise<Response> {
    return fetch(url, { ...init, headers: { Authorization: this.authHeader, ...init.headers } });
  }
}
