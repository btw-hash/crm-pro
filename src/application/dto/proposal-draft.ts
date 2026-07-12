import type { Client } from "@/domain/client/client";
import type { Money } from "@/domain/pricing/money";
import type { ProposalEconomics, ProposalLineItem } from "@/domain/proposal/proposal";

export type { ProposalLineItem };

/** A single line item in the proposal draft (flat, no domain value-objects except Money). */
export interface ProposalLineDraft {
  readonly productId: string;
  readonly productName: string;
  readonly unit: string;
  readonly quantity: number;
  readonly unitPrice: Money | null;
  readonly lineTotal: Money | null;
}

/** Proposal draft: line items + economics + AI-generated text. */
export interface ProposalDraft {
  readonly client: Client;
  readonly lines: readonly ProposalLineDraft[];
  /** Total cost of all line items; null if no price is set for any of them. */
  readonly totalCost: Money | null;
  readonly economics: ProposalEconomics;
  /** Cover text drafted by the AI from the already-computed numbers. */
  readonly prose: string;
}
