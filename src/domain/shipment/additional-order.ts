import type { ClientId } from "@/domain/client/client";
import type { Id } from "@/domain/shared/id";

export type AdditionalOrderId = Id<"AdditionalOrderId">;

/**
 * An add-on request line: item (text) + quantity. The product is free text, not tied to
 * the catalog: the manager logs the add-on order verbally outside working hours, usually
 * 1-3 line items.
 */
export interface AdditionalOrderLine {
  readonly productName: string;
  readonly quantity: number;
  readonly unit: string;
}

/**
 * An add-on request placed outside working hours: the client adds to their order late in
 * the evening / early in the morning — the manager logs the line items and links them to
 * an already-placed/sent request from the same day. It ships the same day, the warehouse
 * picks the extra items.
 *
 * Key invariants:
 * - `parentOrderNumber` — the parent request's order number (same client, same day);
 * - `shipmentDate` === the parent request's date (ISO `yyyy-mm-dd`);
 * - `createdAt` can be outside working hours (evening/early morning) — that's the norm
 *   and exactly the point of an add-on request.
 */
export interface AdditionalOrder {
  readonly id: AdditionalOrderId;
  readonly clientId: ClientId;
  /** Parent request's order number (from the ERP, or free text before ERP integration). */
  readonly parentOrderNumber: string;
  readonly lines: readonly AdditionalOrderLine[];
  /** Shipment date (ISO yyyy-mm-dd) — the same as the parent request's. */
  readonly shipmentDate: string;
  /** Who logged the add-on request (id of the sales rep or head of sales). */
  readonly recordedBy: string;
  /** ISO timestamp when it was logged (can be at night). */
  readonly createdAt: string;
  readonly note: string | null;
}

export class AdditionalOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdditionalOrderError";
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface CreateAdditionalOrderInput {
  readonly id: AdditionalOrderId;
  readonly clientId: ClientId;
  readonly parentOrderNumber: string;
  readonly lines: readonly AdditionalOrderLine[];
  /** Shipment date (ISO yyyy-mm-dd) — must match the parent request's. */
  readonly shipmentDate: string;
  readonly recordedBy: string;
  readonly createdAt: string;
  readonly note?: string | null;
}

/** Creates an add-on request with minimal validation. Pure function, no side effects. */
export function createAdditionalOrder(input: CreateAdditionalOrderInput): AdditionalOrder {
  if (!input.parentOrderNumber.trim()) {
    throw new AdditionalOrderError("Specify the order number the add-on request is attached to.");
  }
  if (!ISO_DATE.test(input.shipmentDate) || Number.isNaN(Date.parse(input.shipmentDate))) {
    throw new AdditionalOrderError("Specify a valid shipment date (yyyy-mm-dd).");
  }
  if (input.lines.length === 0) {
    throw new AdditionalOrderError("Add at least one line item to the add-on request.");
  }
  for (const line of input.lines) {
    if (!line.productName.trim()) {
      throw new AdditionalOrderError("Specify the item for each line.");
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new AdditionalOrderError("The quantity in each line must be greater than zero.");
    }
  }
  return {
    id: input.id,
    clientId: input.clientId,
    parentOrderNumber: input.parentOrderNumber.trim(),
    lines: input.lines.map((l) => ({
      productName: l.productName.trim(),
      quantity: l.quantity,
      unit: l.unit.trim() || "unit",
    })),
    shipmentDate: input.shipmentDate,
    recordedBy: input.recordedBy,
    createdAt: input.createdAt,
    note: input.note?.trim() || null,
  };
}

/**
 * Checks that the add-on request's date matches the parent shipment's date.
 * Business rule: an add-on request ships the same day.
 */
export function isSameDayAsParent(order: AdditionalOrder, parentShipmentDate: string): boolean {
  return order.shipmentDate === parentShipmentDate;
}

/** Short summary of the add-on request's line items, for display in tables. */
export function additionalOrderLinesSummary(order: AdditionalOrder): string {
  return order.lines.map((l) => `${l.productName} — ${l.quantity} ${l.unit}`).join("; ");
}
