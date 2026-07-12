import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import type { Id } from "@/domain/shared/id";

export type SampleRequestId = Id<"SampleRequestId">;

/** A sample/test-batch request: records what and how much is reserved for testing. */
export interface SampleRequest {
  readonly id: SampleRequestId;
  readonly dealId: DealId;
  readonly productId: ProductId;
  readonly quantity: number;
  readonly unit: string;
  readonly requestedBy: string;
  /** Receiving technologist: who the request is routed to (round-robin, #6). */
  readonly assignedTechnologistId: string;
  readonly requestedAt: string; // ISO
}

export class SampleRequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SampleRequestValidationError";
  }
}

export class SampleRequestNotFoundError extends Error {
  constructor(id: SampleRequestId) {
    super(`Sample request ${id} not found`);
    this.name = "SampleRequestNotFoundError";
  }
}

export interface CreateSampleRequestInput {
  readonly id: SampleRequestId;
  readonly dealId: DealId;
  readonly productId: ProductId;
  readonly quantity: number;
  readonly unit: string;
  readonly requestedBy: string;
  readonly assignedTechnologistId: string;
  readonly requestedAt: string;
}

export function createSampleRequest(input: CreateSampleRequestInput): SampleRequest {
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new SampleRequestValidationError("Sample quantity must be greater than zero");
  }
  if (input.assignedTechnologistId.trim() === "") {
    throw new SampleRequestValidationError("No technologist assigned for the test");
  }
  return {
    id: input.id,
    dealId: input.dealId,
    productId: input.productId,
    quantity: input.quantity,
    unit: input.unit,
    requestedBy: input.requestedBy,
    assignedTechnologistId: input.assignedTechnologistId,
    requestedAt: input.requestedAt,
  };
}
