import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { Id } from "@/domain/shared/id";

export type ReturnClaimId = Id<"ReturnClaimId">;

/** Return/claim reason. */
export const RETURN_REASONS = ["defect", "wrong_item", "expired", "shortage", "other"] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  defect: "Defect",
  wrong_item: "Wrong item",
  expired: "Expired",
  shortage: "Shortfall",
  other: "Other",
};

export function isReturnReason(value: string): value is ReturnReason {
  return (RETURN_REASONS as readonly string[]).includes(value);
}

/**
 * Return process stages — from the initial memo to document correction:
 * requested → invoice_issued (return invoice, accounting) → picked_up
 * (warehouse/driver picked it up) → received (goods posted in the ERP) → corrected
 * (shipping documents corrected). The order is fixed — `advanceReturn` follows it.
 */
export const RETURN_STATUS_FLOW = [
  "requested",
  "invoice_issued",
  "picked_up",
  "received",
  "corrected",
] as const;

export type ReturnStatus = (typeof RETURN_STATUS_FLOW)[number] | "rejected";

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Return requested",
  invoice_issued: "Return invoice issued",
  picked_up: "Picked up by warehouse",
  received: "Received at warehouse (ERP)",
  corrected: "Documents corrected",
  rejected: "Rejected",
};

export interface ReturnClaim {
  readonly id: ReturnClaimId;
  readonly clientId: ClientId;
  /** The deal that originated the shipment (if known). */
  readonly dealId: DealId | null;
  readonly productName: string;
  readonly quantity: number;
  readonly unit: string;
  readonly reason: ReturnReason;
  readonly comment: string | null;
  readonly status: ReturnStatus;
  readonly createdBy: string;
  readonly createdAt: string;
}

export class ReturnClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReturnClaimError";
  }
}

export interface CreateReturnClaimInput {
  readonly id: ReturnClaimId;
  readonly clientId: ClientId;
  readonly dealId?: DealId | null;
  readonly productName: string;
  readonly quantity: number;
  readonly unit?: string;
  readonly reason: ReturnReason;
  readonly comment?: string | null;
  readonly createdBy: string;
  readonly createdAt: string;
}

/** Creates a claim/return at the "Return requested" stage. Minimal validation. */
export function createReturnClaim(input: CreateReturnClaimInput): ReturnClaim {
  if (input.productName.trim() === "") {
    throw new ReturnClaimError("Specify the product to return");
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new ReturnClaimError("Quantity to return must be greater than zero");
  }
  if (!RETURN_REASONS.includes(input.reason)) {
    throw new ReturnClaimError(`Invalid return reason: ${input.reason}`);
  }
  return {
    id: input.id,
    clientId: input.clientId,
    dealId: input.dealId ?? null,
    productName: input.productName.trim(),
    quantity: input.quantity,
    unit: input.unit?.trim() || "pcs",
    reason: input.reason,
    comment: input.comment?.trim() || null,
    status: "requested",
    createdBy: input.createdBy,
    createdAt: input.createdAt,
  };
}

/** Whether the return process is complete (documents corrected or rejected). */
export function isReturnTerminal(status: ReturnStatus): boolean {
  return status === "corrected" || status === "rejected";
}

/** Advances the return to the next process stage. Cannot advance a terminal/rejected one. */
export function advanceReturn(claim: ReturnClaim): ReturnClaim {
  if (claim.status === "rejected") {
    throw new ReturnClaimError("A rejected return cannot be moved through the process");
  }
  const index = RETURN_STATUS_FLOW.indexOf(claim.status);
  const next = RETURN_STATUS_FLOW[index + 1];
  if (next === undefined) {
    throw new ReturnClaimError("The return is already at the final stage (documents corrected)");
  }
  return { ...claim, status: next };
}

/** Rejects the return — only before the return invoice is issued (goods not yet in transit). */
export function rejectReturn(claim: ReturnClaim): ReturnClaim {
  if (claim.status !== "requested") {
    throw new ReturnClaimError(
      `Only a return request can be rejected, but it is in status "${RETURN_STATUS_LABELS[claim.status]}"`,
    );
  }
  return { ...claim, status: "rejected" };
}
