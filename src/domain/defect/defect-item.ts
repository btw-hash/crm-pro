import type { Id } from "@/domain/shared/id";

export type DefectItemId = Id<"DefectItemId">;

/** Reason the item ended up in the defect warehouse (the item's condition). */
export const DEFECT_REASONS = ["wrong_label", "damaged_pack", "regrade", "expiring"] as const;
export type DefectReason = (typeof DEFECT_REASONS)[number];

export const DEFECT_REASON_LABELS: Record<DefectReason, string> = {
  wrong_label: "Wrong label",
  damaged_pack: "Damaged packaging",
  regrade: "Regrade",
  expiring: "Expiring soon",
};

/**
 * The relabeling process: item in the defect warehouse -> relabeling request ->
 * moved to the relabeling warehouse (in progress) -> ready -> released (back
 * into circulation). The order is fixed.
 */
export const DEFECT_STATUS_FLOW = [
  "on_defect_stock",
  "relabel_requested",
  "relabeling",
  "ready",
  "released",
] as const;
export type DefectStatus = (typeof DEFECT_STATUS_FLOW)[number];

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  on_defect_stock: "In defect warehouse",
  relabel_requested: "Relabeling requested",
  relabeling: "In relabeling warehouse",
  ready: "Ready",
  released: "Released into circulation",
};

export interface DefectItem {
  readonly id: DefectItemId;
  readonly productName: string;
  readonly quantity: number;
  readonly unit: string;
  readonly reason: DefectReason;
  readonly status: DefectStatus;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly note: string | null;
}

export class DefectItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DefectItemError";
  }
}

export interface CreateDefectItemInput {
  readonly id: DefectItemId;
  readonly productName: string;
  readonly quantity: number;
  readonly unit?: string;
  readonly reason: DefectReason;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly note?: string | null;
}

/** Puts an item into the defect warehouse. Minimal validation. */
export function createDefectItem(input: CreateDefectItemInput): DefectItem {
  if (input.productName.trim() === "") {
    throw new DefectItemError("Specify the product");
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new DefectItemError("Quantity must be greater than zero");
  }
  if (!DEFECT_REASONS.includes(input.reason)) {
    throw new DefectItemError(`Invalid reason: ${input.reason}`);
  }
  return {
    id: input.id,
    productName: input.productName.trim(),
    quantity: input.quantity,
    unit: input.unit?.trim() || "kg",
    reason: input.reason,
    status: "on_defect_stock",
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    note: input.note?.trim() || null,
  };
}

/** Whether the process is complete (the item was released into circulation). */
export function isDefectReleased(status: DefectStatus): boolean {
  return status === "released";
}

/** Advances the item to the next relabeling stage. A released item cannot advance further. */
export function advanceDefect(item: DefectItem): DefectItem {
  const index = DEFECT_STATUS_FLOW.indexOf(item.status);
  const next = DEFECT_STATUS_FLOW[index + 1];
  if (next === undefined) {
    throw new DefectItemError("The item has already been released into circulation");
  }
  return { ...item, status: next };
}

export function isDefectReason(value: string): value is DefectReason {
  return (DEFECT_REASONS as readonly string[]).includes(value);
}
