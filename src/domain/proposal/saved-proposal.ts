import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import type { Id } from "@/domain/shared/id";

/**
 * Saved proposal — a snapshot of line items and accompanying text, assembled at the
 * "Proposal review" stage. Unlike `ProposalLineItem`/`computeEconomics` (draft
 * calculation), this is a PERSISTENT entity: one record per deal (upsert by dealId),
 * so at the "Completed" stage the proposal can be shown as a document and used to
 * prefill the "Sales order (ERP)".
 *
 * Prices are manual (entered by a human, in dollars), not invented by AI; AI only
 * drafts the `prose`.
 */
export type SavedProposalId = Id<"SavedProposalId">;

/** Proposal status in the negotiation: draft → sent to client → approved/declined. */
export type ProposalStatus = "draft" | "sent" | "approved" | "declined";

export const PROPOSAL_STATUSES: readonly ProposalStatus[] = [
  "draft",
  "sent",
  "approved",
  "declined",
];

export function isProposalStatus(value: string): value is ProposalStatus {
  return (PROPOSAL_STATUSES as readonly string[]).includes(value);
}

export interface SavedProposalLine {
  readonly productId: ProductId;
  readonly productName: string;
  readonly unit: string;
  /** Quantity in catalog units. */
  readonly quantity: number;
  /** Per-unit price in dollars (manual, from the proposal). */
  readonly unitPriceUsd: number;
}

export interface SavedProposal {
  readonly id: SavedProposalId;
  readonly dealId: DealId;
  readonly clientId: ClientId | null;
  /** Proposal revision number (the client asked for changes → N+1). */
  readonly revision: number;
  readonly lines: readonly SavedProposalLine[];
  readonly prose: string;
  readonly status: ProposalStatus;
  readonly savedAt: string;
}

export interface SaveProposalInput {
  readonly id: SavedProposalId;
  readonly dealId: DealId;
  readonly clientId?: ClientId | null;
  readonly revision?: number;
  readonly lines: readonly SavedProposalLine[];
  readonly prose?: string;
  readonly status?: ProposalStatus;
  readonly savedAt: string;
}

export class SavedProposalValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SavedProposalValidationError";
  }
}

/** Line total = price × quantity, in dollars. */
export function proposalLineTotalUsd(line: SavedProposalLine): number {
  return line.unitPriceUsd * line.quantity;
}

/** Proposal grand total = the sum of all line totals, in dollars. */
export function proposalGrandTotalUsd(lines: readonly SavedProposalLine[]): number {
  return lines.reduce((sum, line) => sum + proposalLineTotalUsd(line), 0);
}

/**
 * Builds a valid `SavedProposal` from the input. Deterministic checks: at least one
 * line item, quantity > 0, price ≥ 0, revision ≥ 1. Text/status get safe defaults
 * (draft, empty prose).
 */
export function createSavedProposal(input: SaveProposalInput): SavedProposal {
  if (input.lines.length === 0) {
    throw new SavedProposalValidationError("A proposal must contain at least one line item.");
  }
  for (const line of input.lines) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new SavedProposalValidationError(
        "The quantity for each line item must be greater than zero.",
      );
    }
    if (!Number.isFinite(line.unitPriceUsd) || line.unitPriceUsd < 0) {
      throw new SavedProposalValidationError("A line item's price can't be negative.");
    }
  }
  const revision = input.revision ?? 1;
  if (!Number.isInteger(revision) || revision < 1) {
    throw new SavedProposalValidationError("The proposal revision must be a whole number ≥ 1.");
  }
  return {
    id: input.id,
    dealId: input.dealId,
    clientId: input.clientId ?? null,
    revision,
    lines: input.lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      unit: line.unit,
      quantity: line.quantity,
      unitPriceUsd: line.unitPriceUsd,
    })),
    prose: input.prose ?? "",
    status: input.status ?? "draft",
    savedAt: input.savedAt,
  };
}
