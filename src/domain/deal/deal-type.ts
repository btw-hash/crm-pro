import type { DealStage } from "./deal-stage";

/**
 * Process type (#0055): sets the starting stage and the route through the funnel.
 * - new_client — new client, full path (qualification → … → completed).
 * - test — the client asks for a test / on-site technologist visit: starts
 *   directly at "Tech request" (sample/demo is part of this stage), then
 *   "Tech response" → onward through the funnel.
 * - defect / packing — operational types (defect/packing); in the demo this is a
 *   tag + start from qualification, detailed route — after the demo (0055 brainstorm).
 */
export const DEAL_TYPES = ["new_client", "test", "defect", "packing"] as const;
export type DealType = (typeof DEAL_TYPES)[number];

export const DEAL_TYPE_LABELS: Record<DealType, string> = {
  new_client: "New client",
  test: "Test / trial",
  defect: "Defect",
  packing: "Packing",
};

export const DEFAULT_DEAL_TYPE: DealType = "new_client";

/** Starting stage by process type. */
export const DEAL_TYPE_START_STAGE: Record<DealType, DealStage> = {
  new_client: "qualification",
  test: "audit",
  defect: "qualification",
  packing: "qualification",
};

export function isDealType(value: string): value is DealType {
  return (DEAL_TYPES as readonly string[]).includes(value);
}
