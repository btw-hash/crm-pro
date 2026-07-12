import type { ClientId } from "@/domain/client/client";
import type { Id } from "@/domain/shared/id";

export type PackingRequestId = Id<"PackingRequestId">;

/** Packing request stages: created → in progress (packing) → done. */
export const PACKING_STATUS_FLOW = ["requested", "in_progress", "done"] as const;
export type PackingStatus = (typeof PACKING_STATUS_FLOW)[number];

export const PACKING_STATUS_LABELS: Record<PackingStatus, string> = {
  requested: "Request created",
  in_progress: "In progress (packing)",
  done: "Done",
};

export interface PackingRequest {
  readonly id: PackingRequestId;
  readonly clientId: ClientId | null;
  readonly productName: string;
  /** Source pack, e.g. "1 kg". */
  readonly sourcePack: string;
  /** Target pack, e.g. "10 x 100 g". */
  readonly targetPack: string;
  /** How many units of the source pack need to be packed. */
  readonly quantity: number;
  readonly unit: string;
  readonly status: PackingStatus;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly note: string | null;
}

export class PackingRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PackingRequestError";
  }
}

export interface CreatePackingRequestInput {
  readonly id: PackingRequestId;
  readonly clientId?: ClientId | null;
  readonly productName: string;
  readonly sourcePack: string;
  readonly targetPack: string;
  readonly quantity: number;
  readonly unit?: string;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly note?: string | null;
}

/** Creates a packing request at the "Request created" stage. Minimal validation. */
export function createPackingRequest(input: CreatePackingRequestInput): PackingRequest {
  if (input.productName.trim() === "") {
    throw new PackingRequestError("Specify the product to pack");
  }
  if (input.sourcePack.trim() === "" || input.targetPack.trim() === "") {
    throw new PackingRequestError("Specify the source and target pack");
  }
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
    throw new PackingRequestError("Quantity must be greater than zero");
  }
  return {
    id: input.id,
    clientId: input.clientId ?? null,
    productName: input.productName.trim(),
    sourcePack: input.sourcePack.trim(),
    targetPack: input.targetPack.trim(),
    quantity: input.quantity,
    unit: input.unit?.trim() || "units",
    status: "requested",
    requestedBy: input.requestedBy,
    createdAt: input.createdAt,
    note: input.note?.trim() || null,
  };
}

/** Whether the request is complete (done). */
export function isPackingDone(status: PackingStatus): boolean {
  return status === "done";
}

/** Advances the request to the next stage. Cannot advance a done request. */
export function advancePacking(request: PackingRequest): PackingRequest {
  const index = PACKING_STATUS_FLOW.indexOf(request.status);
  const next = PACKING_STATUS_FLOW[index + 1];
  if (next === undefined) {
    throw new PackingRequestError("Request is already done");
  }
  return { ...request, status: next };
}
