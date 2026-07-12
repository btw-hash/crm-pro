import type { Notifier } from "@/application/ports/notifier";
import type { TechRequestRepository } from "@/application/ports/tech-request-repository";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import {
  createTechRequest,
  TECH_REQUEST_KIND_LABELS,
  type ConsultFormat,
  type DemoLocation,
  type TechRequest,
  type TechRequestId,
  type TechRequestKind,
} from "@/domain/tech-request/tech-request";

export interface CreateTechRequestInput {
  readonly id: TechRequestId;
  readonly dealId: DealId;
  readonly clientId: ClientId;
  readonly productId?: ProductId | null;
  readonly kind: TechRequestKind;
  readonly note: string;
  readonly requestedBy: string;
  readonly createdAt: string;
  /** Deal name for the notification — passed in to avoid an extra DB query. */
  readonly dealTitle: string;
  /** ids of the technologists to notify. */
  readonly technologistIds: readonly string[];
  readonly deadline?: string | null;
  readonly consultFormat?: ConsultFormat | null;
  readonly demoLocation?: DemoLocation | null;
  readonly demoAddress?: string | null;
  readonly demoProducts?: string | null;
  readonly auditFocus?: string | null;
}

export type CreateTechRequest = (input: CreateTechRequestInput) => Promise<TechRequest>;

/**
 * Creates a tech request for the technologist (open) and notifies all
 * technologists in the list. Loop: manager -> request -> tech queue -> they
 * take/close it.
 */
export function makeCreateTechRequest(deps: {
  techRequests: TechRequestRepository;
  notifier: Notifier;
}): CreateTechRequest {
  return async function createTechRequestUseCase(input) {
    const request = createTechRequest({
      id: input.id,
      dealId: input.dealId,
      clientId: input.clientId,
      productId: input.productId,
      kind: input.kind,
      note: input.note,
      requestedBy: input.requestedBy,
      createdAt: input.createdAt,
      deadline: input.deadline,
      consultFormat: input.consultFormat,
      demoLocation: input.demoLocation,
      demoAddress: input.demoAddress,
      demoProducts: input.demoProducts,
      auditFocus: input.auditFocus,
    });
    await deps.techRequests.save(request);
    const kindLabel = TECH_REQUEST_KIND_LABELS[input.kind];
    for (const technologistId of input.technologistIds) {
      await deps.notifier.notify({
        recipientId: technologistId,
        message: `New tech request for the deal "${input.dealTitle}": ${kindLabel}. ${input.note}`,
        dealId: input.dealId,
      });
    }
    return request;
  };
}
