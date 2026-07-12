import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import type { Id } from "@/domain/shared/id";

export type TechRequestId = Id<"TechRequestId">;

export const TECH_REQUEST_KINDS = ["consult", "demo", "audit_req", "onsite", "test"] as const;
export type TechRequestKind = (typeof TECH_REQUEST_KINDS)[number];

export const TECH_REQUEST_KIND_LABELS: Record<TechRequestKind, string> = {
  consult: "Consultation",
  demo: "Demo and tests",
  audit_req: "Audit",
  onsite: "Plant visit",
  test: "Test",
};

export type TechRequestStatus = "open" | "in_progress" | "done";

export const TECH_REQUEST_STATUS_LABELS: Record<TechRequestStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
};

/** Meeting format for a "Consultation" type request. */
export type ConsultFormat = "call" | "video" | "visit";
export const CONSULT_FORMAT_LABELS: Record<ConsultFormat, string> = {
  call: "Phone call",
  video: "Video call",
  visit: "In-person visit",
};

/** Demo location for a "Demo and tests" type request. */
export type DemoLocation = "showroom" | "client";
export const DEMO_LOCATION_LABELS: Record<DemoLocation, string> = {
  showroom: "Millbrook Foods showroom",
  client: "Visit to client",
};

export interface TechRequest {
  readonly id: TechRequestId;
  readonly dealId: DealId;
  readonly clientId: ClientId;
  readonly productId: ProductId | null;
  readonly kind: TechRequestKind;
  readonly note: string;
  readonly status: TechRequestStatus;
  readonly requestedBy: string;
  readonly assignedTo: string | null;
  readonly createdAt: string;
  /** Deadline (ISO date string, optional). */
  readonly deadline: string | null;
  /** Format for kind=consult. */
  readonly consultFormat: ConsultFormat | null;
  /** Location for kind=demo. */
  readonly demoLocation: DemoLocation | null;
  /** Client address when demoLocation=client. */
  readonly demoAddress: string | null;
  /** Products to test (kind=demo), a JSON-serialized list of strings. */
  readonly demoProducts: string | null;
  /** Focus chips for kind=audit_req, a JSON-serialized list of strings. */
  readonly auditFocus: string | null;
}

export class TechRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TechRequestError";
  }
}

export interface CreateTechRequestInput {
  readonly id: TechRequestId;
  readonly dealId: DealId;
  readonly clientId: ClientId;
  readonly productId?: ProductId | null;
  readonly kind: TechRequestKind;
  readonly note: string;
  readonly requestedBy: string;
  readonly createdAt: string;
  readonly deadline?: string | null;
  readonly consultFormat?: ConsultFormat | null;
  readonly demoLocation?: DemoLocation | null;
  readonly demoAddress?: string | null;
  readonly demoProducts?: string | null;
  readonly auditFocus?: string | null;
}

export function createTechRequest(input: CreateTechRequestInput): TechRequest {
  if (input.note.trim() === "") {
    throw new TechRequestError("The request note cannot be empty");
  }
  if (!TECH_REQUEST_KINDS.includes(input.kind)) {
    throw new TechRequestError(`Invalid request type: ${input.kind}`);
  }
  return {
    id: input.id,
    dealId: input.dealId,
    clientId: input.clientId,
    productId: input.productId ?? null,
    kind: input.kind,
    note: input.note.trim(),
    status: "open",
    requestedBy: input.requestedBy,
    assignedTo: null,
    createdAt: input.createdAt,
    deadline: input.deadline ?? null,
    consultFormat: input.consultFormat ?? null,
    demoLocation: input.demoLocation ?? null,
    demoAddress: input.demoAddress ?? null,
    demoProducts: input.demoProducts ?? null,
    auditFocus: input.auditFocus ?? null,
  };
}

export function takeInWork(req: TechRequest, technologistId: string): TechRequest {
  if (req.status !== "open") {
    throw new TechRequestError(
      `Only an open request can be taken in progress, but it is in status "${TECH_REQUEST_STATUS_LABELS[req.status]}"`,
    );
  }
  return { ...req, status: "in_progress", assignedTo: technologistId };
}

export function complete(req: TechRequest): TechRequest {
  if (req.status !== "in_progress") {
    throw new TechRequestError(
      `Only a request in progress can be completed, but it is in status "${TECH_REQUEST_STATUS_LABELS[req.status]}"`,
    );
  }
  return { ...req, status: "done" };
}
