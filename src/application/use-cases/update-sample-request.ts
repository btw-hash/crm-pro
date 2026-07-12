import type { SampleRequestRepository } from "@/application/ports/sample-request-repository";
import {
  SampleRequestNotFoundError,
  SampleRequestValidationError,
  type SampleRequest,
  type SampleRequestId,
} from "@/domain/sample/sample-request";

export interface UpdateSampleRequestInput {
  readonly sampleId: SampleRequestId;
  readonly quantity: number;
}

export type UpdateSampleRequest = (input: UpdateSampleRequestInput) => Promise<SampleRequest>;

/** Changes the quantity on an existing sample request. */
export function makeUpdateSampleRequest(deps: {
  samples: SampleRequestRepository;
}): UpdateSampleRequest {
  return async function updateSampleRequest(input) {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new SampleRequestValidationError("Sample quantity must be greater than zero");
    }
    const current = await deps.samples.findById(input.sampleId);
    if (!current) {
      throw new SampleRequestNotFoundError(input.sampleId);
    }
    const updated: SampleRequest = { ...current, quantity: input.quantity };
    await deps.samples.update(updated);
    return updated;
  };
}
