import type { Id } from "@/domain/shared/id";
import type { ClientCategory } from "./client-category";
import type { ClientType } from "./client-type";
import type { LegalEntity } from "./legal-entity";

export type ClientId = Id<"ClientId">;

/** Client — a counterparty from the ERP, enriched with commercial segmentation. */
export interface Client {
  readonly id: ClientId;
  readonly name: string;
  readonly type: ClientType;
  readonly category: ClientCategory;
  /** Responsible manager (sales rep). */
  readonly responsibleManagerId: string;
  readonly ein?: string;
  /** City/locality — for logistics/warehousing. */
  readonly city?: string;
  /** Client's legal entities (one network = several LLCs/sole proprietors). Empty/none — a single legal entity (see `ein`). */
  readonly legalEntities?: readonly LegalEntity[];
}
