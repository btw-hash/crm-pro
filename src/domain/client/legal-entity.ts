import type { Id } from "@/domain/shared/id";

export type LegalEntityId = Id<"LegalEntityId">;

/**
 * A client's legal entity. One "network"/client may buy under several LLCs or sole
 * proprietors — this affects the AR credit limit and order paperwork (a shipment
 * goes out against a specific legal entity).
 */
export interface LegalEntity {
  readonly id: LegalEntityId;
  readonly name: string;
  readonly ein: string;
  readonly kpp?: string;
  /** The default primary legal entity for shipping/paperwork. */
  readonly isPrimary?: boolean;
}
