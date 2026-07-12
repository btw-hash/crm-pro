import type { Money } from "@/domain/pricing/money";
import type { Id } from "@/domain/shared/id";

export type ProductId = Id<"ProductId">;

/**
 * Sales Kit for a product (analogous to Puratos's Pitcher): reference content to show
 * the client during a visit / insert into a proposal. Margin is commercially sensitive
 * (show only to roles with access, see canSeeMargin). Reference data; from the ERP —
 * later.
 */
export interface ProductKit {
  readonly category: string;
  readonly benefits: readonly string[];
  /** Margin %, internal — never goes to the client. */
  readonly marginPercent: number;
  readonly shelfLife: string;
  /** Recommended selling price (RSP). */
  readonly rsp: Money;
}

/**
 * An item as returned by the ERP (the "Items" catalog): only the ERP-owned fields. CRM
 * enrichment (Sales Kit, AI descriptions) lives in the CRM and is NOT overwritten on sync.
 * See the `makeSyncNomenclature` sync.
 */
export type NomenclatureItem = Pick<
  Product,
  "id" | "sku" | "name" | "unit" | "barcode" | "shelfLife" | "packaging"
>;

/** An item from the ERP (+ an optional Sales Kit). */
export interface Product {
  readonly id: ProductId;
  readonly sku: string;
  readonly name: string;
  /** Base unit of measure: kg, pcs, pack. */
  readonly unit: string;
  readonly barcode?: string;
  /** Shelf life from the ERP catalog (e.g. "12 months"). Empty — not set in the ERP. */
  readonly shelfLife?: string;
  /** Packaging from the ERP catalog (e.g. "5 kg box"). Empty — not set. */
  readonly packaging?: string;
  /** Sales Kit (benefits, margin, RSP) — #105; commercial CRM enrichment. */
  readonly kit?: ProductKit;
}

/**
 * Product pitch text to send the client: name, benefits, shelf life.
 * WITHOUT the internal margin (a trade secret that never goes to the client).
 */
export function productPitch(product: Product): string {
  const lines: string[] = [product.name];
  if (product.kit) {
    if (product.kit.benefits.length > 0) {
      lines.push("", "Benefits:", ...product.kit.benefits.map((benefit) => `• ${benefit}`));
    }
    lines.push("", `Shelf life: ${product.kit.shelfLife}`);
  }
  return lines.join("\n");
}
