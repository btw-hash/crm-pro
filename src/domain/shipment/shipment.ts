import type { ClientId } from "@/domain/client/client";
import type { Id } from "@/domain/shared/id";

export type ShipmentId = Id<"ShipmentId">;

/**
 * Stages of the cross-department shipment flow: placed (sales rep) → in accounting
 * (paperwork/ERP) → in the warehouse (picking) → loading/delivery → delivered. The
 * system assembles the derived documents itself (see dispatch.ts), a human confirms
 * each transition — passive capture.
 */
export const SHIPMENT_STATUS_FLOW = [
  "placed",
  "in_accounting",
  "in_warehouse",
  "loading",
  "delivered",
] as const;

/**
 * Shipment status = a stage in the linear flow OR the terminal "cancelled". "cancelled"
 * is NOT part of the flow (no progress, can't advance it) — it's an off-flow terminal:
 * the order was recalled before delivery. The progress track is built only from
 * `SHIPMENT_STATUS_FLOW`.
 */
export type ShipmentStatus = (typeof SHIPMENT_STATUS_FLOW)[number] | "cancelled";

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  placed: "Placed",
  in_accounting: "In accounting",
  in_warehouse: "In the warehouse (picking)",
  loading: "Loading / delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export interface ShipmentLine {
  readonly productName: string;
  readonly quantity: number;
  readonly unit: string;
  /** Full weight of the line item, kg (for the warehouse note and the delivery schedule). */
  readonly weightKg: number;
}

export interface Shipment {
  readonly id: ShipmentId;
  readonly clientId: ClientId;
  /** Responsible sales rep who placed the order (ownership boundary for "My shipments"). */
  readonly managerId: string;
  readonly orderNumber: string;
  /** Delivery address (city included). */
  readonly address: string;
  readonly lines: readonly ShipmentLine[];
  /** Assigned driver/truck; null — not yet assigned. */
  readonly driver: string | null;
  /** Planned delivery date (YYYY-MM-DD). */
  readonly scheduledDate: string;
  readonly status: ShipmentStatus;
  /** Related sales process; null — the shipment was created outside a CRM process (from the seed). */
  readonly dealId: string | null;
}

export class ShipmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShipmentError";
  }
}

/** Total shipment weight, kg. */
export function shipmentTotalWeightKg(shipment: Shipment): number {
  return shipment.lines.reduce((sum, line) => sum + line.weightKg, 0);
}

/** Driver placeholder for when none has been assigned yet (shared across the note/summary/handoff memo). */
export const NO_DRIVER = "— unassigned —";

/** Shipment line items as one string: "Product — N unit; …" (shared format for all documents). */
export function productsSummary(shipment: Shipment): string {
  return shipment.lines
    .map((line) => `${line.productName} — ${line.quantity} ${line.unit}`)
    .join("; ");
}

/** Has the shipment been completed (delivered). */
export function isShipmentDelivered(status: ShipmentStatus): boolean {
  return status === "delivered";
}

/** Has the shipment been cancelled (terminal off-flow state). */
export function isShipmentCancelled(status: ShipmentStatus): boolean {
  return status === "cancelled";
}

/** Advances the shipment to the next flow stage. A delivered/cancelled shipment can't be advanced. */
export function advanceShipment(shipment: Shipment): Shipment {
  if (shipment.status === "cancelled") {
    throw new ShipmentError("The shipment is cancelled — it can't be advanced through the stages");
  }
  const index = SHIPMENT_STATUS_FLOW.indexOf(shipment.status);
  const next = SHIPMENT_STATUS_FLOW[index + 1];
  if (next === undefined) {
    throw new ShipmentError(
      "The shipment has already been delivered — it can't be advanced further",
    );
  }
  return { ...shipment, status: next };
}

/**
 * Cancels the shipment (terminal). A delivered shipment can't be cancelled (already with
 * the client); cancelling again is a no-op (returns the same object).
 */
export function cancelShipment(shipment: Shipment): Shipment {
  if (shipment.status === "delivered") {
    throw new ShipmentError("A delivered shipment can't be cancelled");
  }
  return shipment.status === "cancelled" ? shipment : { ...shipment, status: "cancelled" };
}

/**
 * Advances the shipment to the next stage only if the current stage == allowedStatus.
 * Used by operational roles (accountant, logistics) that only work on their own stage —
 * they can't advance a shipment that's on someone else's stage.
 */
export function advanceShipmentFromStage(
  shipment: Shipment,
  allowedStatus: ShipmentStatus,
): Shipment {
  if (shipment.status !== allowedStatus) {
    throw new ShipmentError(
      `Can't advance the shipment from stage "${SHIPMENT_STATUS_LABELS[shipment.status]}" — only stage "${SHIPMENT_STATUS_LABELS[allowedStatus]}" is allowed`,
    );
  }
  return advanceShipment(shipment);
}
