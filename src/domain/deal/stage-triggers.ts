import type { DealStage } from "./deal-stage";

/**
 * Auto-action on a deal stage transition: creates a reminder task for the
 * responsible manager. Modeled on a legacy CRM's "robots" pattern, but narrow and
 * hardcoded — no no-code builder (see scope discipline). Drives sales discipline:
 * right after a key transition, the manager immediately has a next step.
 */
export interface StageTrigger {
  readonly taskText: string;
  /** Task due date in days from the transition. */
  readonly dueInDays: number;
}

const STAGE_TRIGGERS: Partial<Record<DealStage, StageTrigger>> = {
  quote: { taskText: "Prepare and send the Proposal to the client", dueInDays: 2 },
  testing: { taskText: "Follow up on the test and complete the test act", dueInDays: 3 },
  completed: {
    taskText: "Create the customer order in the ERP and confirm the shipment",
    dueInDays: 1,
  },
};

/** Trigger for the target stage (or null if no auto-task is needed for it). */
export function triggerForStage(stage: DealStage): StageTrigger | null {
  return STAGE_TRIGGERS[stage] ?? null;
}
