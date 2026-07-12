import type { Client } from "@/domain/client/client";
import type { ClientBalance } from "@/domain/client/client-balance";
import type { Contact } from "@/domain/contact/contact";
import type { Money } from "@/domain/pricing/money";
import type { Product } from "@/domain/product/product";

export interface ClientCardLine {
  readonly product: Product;
  /**
   * Client-specific price (trade secret); null if not set in the ERP.
   * The field is ABSENT (undefined) if the role has no access to margin/prices
   * (see `canSeeMargin`): in that case the sensitive number is never
   * requested from the ERP and never ends up in the response.
   */
  readonly price?: Money | null;
  /** Free stock quantity; null if the item is not found in the warehouse. */
  readonly freeQuantity: number | null;
  readonly unit: string;
}

/** Client card: client + contacts + their prices and stock levels by nomenclature. */
export interface ClientCard {
  readonly client: Client;
  /** Contacts (decision-makers/influencers/users) — who to call about the deal. */
  readonly contacts: readonly Contact[];
  readonly lines: readonly ClientCardLine[];
  /**
   * Receivables and credit limit. Like price — commercially sensitive: the field
   * is ABSENT for roles without margin access (see `canSeeMargin`).
   * `null` — the balance isn't set up in the ERP.
   */
  readonly balance?: ClientBalance | null;
}
