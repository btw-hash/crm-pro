import type { DealEventRecorder } from "@/application/ports/deal-event-recorder";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { Notifier } from "@/application/ports/notifier";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { SampleRequestRepository } from "@/application/ports/sample-request-repository";
import { advanceDeal, type DealId } from "@/domain/deal/deal";
import { canTransition, DEAL_STAGE_LABELS, type DealStage } from "@/domain/deal/deal-stage";
import type { ProductId } from "@/domain/product/product";
import {
  createSampleRequest,
  type SampleRequest,
  type SampleRequestId,
} from "@/domain/sample/sample-request";
import { pickNextTechnologist } from "@/domain/sample/technologist-assignment";
import { DealNotFoundError } from "./advance-deal-stage";

// Sample request — part of the "Demo & testing" flow: moves the deal from
// "Request to technologist" (audit) into "Technologist response" (testing);
// if it's already there — reserve stock without changing the stage.
// There is no separate "Sample request" stage anymore (design: 5 stages).
const SAMPLE_TARGET_STAGE: DealStage = "testing";

export class SampleRequestStageError extends Error {
  constructor(readonly from: DealStage) {
    super(
      `A test can only be requested at the "${DEAL_STAGE_LABELS["audit"]}" or "${DEAL_STAGE_LABELS["testing"]}" stage, but the deal is at "${DEAL_STAGE_LABELS[from]}".`,
    );
    this.name = "SampleRequestStageError";
  }
}

export class InsufficientStockError extends Error {
  constructor(
    readonly available: number,
    readonly unit: string | null,
  ) {
    super(
      unit
        ? `Not enough free stock to reserve (available: ${available} ${unit}).`
        : "The item is out of stock — reservation is not possible.",
    );
    this.name = "InsufficientStockError";
  }
}

export interface RequestSampleInput {
  readonly id: SampleRequestId;
  readonly dealId: DealId;
  readonly productId: ProductId;
  readonly quantity: number;
  readonly requestedBy: string;
  readonly requestedAt: string;
}

export type RequestSample = (input: RequestSampleInput) => Promise<SampleRequest>;

/**
 * Sample request: reserves a test batch in stock (via the ERP), routes it to
 * a technologist (round-robin) with a notification. From "Audit" — moves the
 * deal into the testing stage; if the deal is already at the testing stage —
 * reserves stock without changing the stage (that stage's whole content is
 * the sample request itself).
 * Closes the audit → test → act chain. Technologists are an external list
 * (config), #6.
 */
export function makeRequestSample(deps: {
  deals: DealRepository;
  samples: SampleRequestRepository;
  erp: ErpGateway;
  notifier: Notifier;
  events: DealEventRecorder;
  technologistIds: readonly string[];
}): RequestSample {
  return async function requestSample(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    // Check the stage first — so we don't reserve stock for nothing.
    // NB: on the in-memory demo, the "read stage → reserve → save" transition
    // is not atomic. A plain double submit is already covered (the button is
    // disabled while the request is in flight + the form disappears after
    // revalidate), but protection against concurrent-request races
    // (optimistic locking on the stage / a transaction) is added when we move
    // to a real database — see #15 (PostgreSQL).
    // Requesting a sample is allowed from "Audit" (then we move the deal into
    // the testing stage) OR when the deal is ALREADY at the testing stage —
    // its whole content is the sample request itself, so we reserve stock
    // without changing the stage. Otherwise the stage is not eligible.
    const alreadyAtTarget = deal.stage === SAMPLE_TARGET_STAGE;
    if (!alreadyAtTarget && !canTransition(deal.stage, SAMPLE_TARGET_STAGE)) {
      throw new SampleRequestStageError(deal.stage);
    }
    // Figure out who to assign before reserving stock: an empty technologist
    // list is a domain error (misconfig) — better to fail early than hold a
    // reservation for nothing.
    const lastSample = await deps.samples.findLast();
    const assignedTechnologistId = pickNextTechnologist(
      deps.technologistIds,
      lastSample?.assignedTechnologistId,
    );
    const reservation = await deps.erp.reserveStock(input.productId, input.quantity);
    if (!reservation.ok) {
      throw new InsufficientStockError(reservation.available, reservation.unit);
    }
    const request = createSampleRequest({
      id: input.id,
      dealId: input.dealId,
      productId: input.productId,
      quantity: reservation.reservedQuantity,
      unit: reservation.unit,
      requestedBy: input.requestedBy,
      assignedTechnologistId,
      requestedAt: input.requestedAt,
    });
    await deps.samples.save(request);
    if (alreadyAtTarget) {
      // The deal is already at the testing stage — we don't move the stage,
      // just record the fact of the reservation.
      await deps.events.record({
        dealId: deal.id,
        type: "sample_requested",
        summary: `Sample request: reserved ${request.quantity}${request.unit ? ` ${request.unit}` : ""} for testing`,
        actor: input.requestedBy,
      });
    } else {
      await deps.deals.save(advanceDeal(deal, SAMPLE_TARGET_STAGE));
      await deps.events.record({
        dealId: deal.id,
        type: "stage_changed",
        summary: `Stage: ${DEAL_STAGE_LABELS[deal.stage]} → ${DEAL_STAGE_LABELS[SAMPLE_TARGET_STAGE]} (sample request)`,
        actor: input.requestedBy,
        fromStage: deal.stage,
        toStage: SAMPLE_TARGET_STAGE,
      });
    }
    await deps.notifier.notify({
      recipientId: assignedTechnologistId,
      message: `New sample test request for deal "${deal.title}": reserved ${reservation.reservedQuantity} ${reservation.unit}. Run the test and file the act.`,
      dealId: deal.id,
    });
    return request;
  };
}
