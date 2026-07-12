import type { ClientId } from "@/domain/client/client";
import type { Id } from "@/domain/shared/id";
import type { DealGoal } from "./deal-goal";
import { DEAL_TYPE_START_STAGE, type DealType } from "./deal-type";
import {
  canRevert,
  canTransition,
  DEAL_STAGE_LABELS,
  type DealOutcome,
  type DealStage,
} from "./deal-stage";

export class DealValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealValidationError";
  }
}

export interface CreateDealInput {
  readonly id: DealId;
  readonly clientId: ClientId;
  readonly title: string;
  readonly responsibleManagerId: string;
  readonly goal?: DealGoal;
  /** Process type (#0055): sets the starting stage. Defaults to new client. */
  readonly type?: DealType;
  readonly comment?: string;
}

export function createDeal(input: CreateDealInput): Deal {
  if (!input.title.trim()) {
    throw new DealValidationError("Deal title cannot be empty");
  }
  const comment = input.comment?.trim();
  const type: DealType = input.type ?? "new_client";
  return {
    id: input.id,
    clientId: input.clientId,
    title: input.title.trim(),
    // The starting stage is determined by the process type: "test" starts
    // directly at the "test request" stage, others — at qualification (#0055).
    stage: DEAL_TYPE_START_STAGE[type],
    responsibleManagerId: input.responsibleManagerId,
    goal: input.goal,
    type,
    ...(comment ? { comment } : {}),
  };
}

export interface UpdateDealDetailsInput {
  readonly title?: string;
  readonly clientId?: ClientId;
  readonly responsibleManagerId?: string;
  readonly goal?: DealGoal;
  readonly comment?: string;
}

export function updateDealDetails(deal: Deal, patch: UpdateDealDetailsInput): Deal {
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new DealValidationError("Deal title cannot be empty");
  }
  return {
    ...deal,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.clientId !== undefined ? { clientId: patch.clientId } : {}),
    ...(patch.responsibleManagerId !== undefined
      ? { responsibleManagerId: patch.responsibleManagerId }
      : {}),
    ...(patch.goal !== undefined ? { goal: patch.goal } : {}),
    // An empty comment clears the field (undefined instead of "") so the card
    // doesn't show an empty section.
    ...(patch.comment !== undefined ? { comment: patch.comment.trim() || undefined } : {}),
  };
}

export type DealId = Id<"DealId">;

/** A deal is maintained as a live commercial object moving through the funnel. */
export interface Deal {
  readonly id: DealId;
  readonly clientId: ClientId;
  readonly title: string;
  readonly stage: DealStage;
  readonly responsibleManagerId: string;
  /** Explicit deal goal (edited by a human). Not set → treated as "Other". */
  readonly goal?: DealGoal;
  /** Process type (#0055): new client / test / defect / packing. Not set → new client. */
  readonly type?: DealType;
  /** Outcome of a completed deal. Set on transition to "Completed". null — not defined. */
  readonly outcome?: DealOutcome;
  /** Free-form comment on the process (edited by a human). null — not set. */
  readonly comment?: string;
  /**
   * Soft-delete marker (ISO). Set → the process is deleted: hidden from lists/board/
   * analytics, but the record and its full history (events/activities) are kept (#397 item 23).
   */
  readonly deletedAt?: string;
}

export class DealStageTransitionError extends Error {
  constructor(
    readonly from: DealStage,
    readonly to: DealStage,
  ) {
    super(`Invalid deal transition: ${from} → ${to}`);
    this.name = "DealStageTransitionError";
  }
}

/**
 * Moves the deal to a new stage, checking that the transition is allowed.
 * Returns a new object (immutability), without mutating the original.
 */
export function advanceDeal(deal: Deal, to: DealStage): Deal {
  if (!canTransition(deal.stage, to)) {
    throw new DealStageTransitionError(deal.stage, to);
  }
  return { ...deal, stage: to };
}

export class DealStageRevertError extends Error {
  constructor(
    readonly from: DealStage,
    readonly to: DealStage,
  ) {
    super(`Invalid deal stage revert: ${from} → ${to}`);
    this.name = "DealStageRevertError";
  }
}

/**
 * Reverts the deal to an earlier stage (fixing a transition mistake). The target
 * stage must be open and precede the current one in the funnel.
 */
export function revertDeal(deal: Deal, to: DealStage): Deal {
  if (!canRevert(deal.stage, to)) {
    throw new DealStageRevertError(deal.stage, to);
  }
  return { ...deal, stage: to };
}

export class DealOutcomeError extends Error {
  constructor(readonly stage: DealStage) {
    super(
      `The outcome can only be set on a completed deal, but the deal is at "${DEAL_STAGE_LABELS[stage]}".`,
    );
    this.name = "DealOutcomeError";
  }
}

/**
 * Records the outcome of a completed deal (Won/Lost). Allowed only at the
 * "Completed" stage; re-setting is allowed (outcome correction). Immutable.
 */
export function setDealOutcome(deal: Deal, outcome: DealOutcome): Deal {
  if (deal.stage !== "completed") {
    throw new DealOutcomeError(deal.stage);
  }
  return { ...deal, outcome };
}

export class DealAlreadyDeletedError extends Error {
  constructor(readonly id: DealId) {
    super(`Process already deleted: ${id}`);
    this.name = "DealAlreadyDeletedError";
  }
}

/**
 * Soft-deletes the process: sets the `deletedAt` marker without erasing the
 * record or its history (#397 item 23). Immutable. Deleting again is an error.
 */
export function softDeleteDeal(deal: Deal, at: string): Deal {
  if (deal.deletedAt) {
    throw new DealAlreadyDeletedError(deal.id);
  }
  return { ...deal, deletedAt: at };
}

/** The process is active (not soft-deleted) — for filtering lists/board/analytics. */
export function isDealActive(deal: Deal): boolean {
  return !deal.deletedAt;
}
