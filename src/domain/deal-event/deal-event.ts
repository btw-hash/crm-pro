import type { DealId } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";
import type { Id } from "@/domain/shared/id";

export type DealEventId = Id<"DealEventId">;

/**
 * Deal domain event type. The event log is an immutable history of "what
 * happened" (as opposed to `Activity` — a manager's planned work). Feeds the
 * activity feed (display) and funnel analytics (stage velocity).
 */
export const DEAL_EVENT_TYPES = [
  "stage_changed",
  "stage_reverted",
  "goal_set",
  "audit_saved",
  "sample_requested",
  "test_act_recorded",
  "outcome_set",
  "order_placed",
  "deal_deleted",
] as const;
export type DealEventType = (typeof DEAL_EVENT_TYPES)[number];

export const DEAL_EVENT_TYPE_LABELS: Record<DealEventType, string> = {
  stage_changed: "Stage change",
  stage_reverted: "Stage revert",
  goal_set: "Deal goal",
  audit_saved: "Production audit",
  sample_requested: "Sample request",
  test_act_recorded: "Test act",
  outcome_set: "Deal outcome",
  order_placed: "Customer order",
  deal_deleted: "Process deletion",
};

export interface DealEvent {
  readonly id: DealEventId;
  readonly dealId: DealId;
  readonly type: DealEventType;
  /** Human-readable description for the feed. */
  readonly summary: string;
  /** Who initiated it: manager/technologist id, or "system". */
  readonly actor: string;
  readonly createdAt: string;
  /** Only for stage_changed: from/to — needed for stage velocity. */
  readonly fromStage: DealStage | null;
  readonly toStage: DealStage | null;
}

export interface CreateDealEventInput {
  readonly id: DealEventId;
  readonly dealId: DealId;
  readonly type: DealEventType;
  readonly summary: string;
  readonly actor: string;
  readonly createdAt: string;
  readonly fromStage?: DealStage | null;
  readonly toStage?: DealStage | null;
}

export class DealEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealEventValidationError";
  }
}

/** Creates a domain event with minimal validation. Pure function. */
export function createDealEvent(input: CreateDealEventInput): DealEvent {
  if (input.summary.trim() === "") {
    throw new DealEventValidationError("Event description cannot be empty");
  }
  return {
    id: input.id,
    dealId: input.dealId,
    type: input.type,
    summary: input.summary.trim(),
    actor: input.actor,
    createdAt: input.createdAt,
    fromStage: input.fromStage ?? null,
    toStage: input.toStage ?? null,
  };
}
