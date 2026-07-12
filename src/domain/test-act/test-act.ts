import type { DealId } from "@/domain/deal/deal";
import type { Id } from "@/domain/shared/id";
import type { TechRequestId } from "@/domain/tech-request/tech-request";

export type TestActId = Id<"TestActId">;

/** Test outcome. A single source of truth (the AI gateway imports from here). */
export const TEST_ACT_RESULTS = ["success", "partial", "failure", "unknown"] as const;
export type TestActResult = (typeof TEST_ACT_RESULTS)[number];

export const TEST_ACT_RESULT_LABELS: Record<TestActResult, string> = {
  success: "Successful",
  partial: "Partial",
  failure: "Unsuccessful",
  unknown: "Not specified",
};

/** A narrow check that a string is a valid test outcome (for the server-action boundary). */
export function isTestActResult(value: unknown): value is TestActResult {
  return typeof value === "string" && (TEST_ACT_RESULTS as readonly string[]).includes(value);
}

/** The act's kind depends on the kind of tech request. */
export const TEST_ACT_KINDS = ["workup", "consult_summary", "audit_summary"] as const;
export type TestActKind = (typeof TEST_ACT_KINDS)[number];

export const TEST_ACT_KIND_LABELS: Record<TestActKind, string> = {
  workup: "Workup act",
  consult_summary: "Consultation summary",
  audit_summary: "Audit summary",
};

/** A human-confirmed act (workup/consultation/audit) for a tech request. */
export interface TestAct {
  readonly id: TestActId;
  readonly dealId: DealId;
  /** Link to a specific tech request (for end-to-end traceability, REQ-6). */
  readonly techRequestId: TechRequestId | null;
  readonly actKind: TestActKind;
  readonly clientName: string | null;
  // Workup act fields (actKind=workup)
  readonly equipment: string | null;
  readonly productName: string | null;
  readonly dosage: string | null;
  readonly processParams: string | null;
  // Consultation summary fields (actKind=consult_summary)
  readonly recommendation: string | null;
  // Audit summary fields (actKind=audit_summary)
  readonly auditChecked: string | null;
  readonly auditRemarks: string | null;
  readonly auditRecommendation: string | null;
  // Common
  readonly result: TestActResult;
  readonly comment: string | null;
  readonly confirmedBy: string;
  readonly confirmedAt: string;
  /** When the technologist clicked "Send to manager" — null while not yet sent. */
  readonly sentAt: string | null;
}

export interface CreateTestActInput {
  readonly id: TestActId;
  readonly dealId: DealId;
  readonly techRequestId?: TechRequestId | null;
  readonly actKind?: TestActKind;
  readonly clientName?: string | null;
  readonly equipment?: string | null;
  readonly productName?: string | null;
  readonly dosage?: string | null;
  readonly processParams?: string | null;
  readonly recommendation?: string | null;
  readonly auditChecked?: string | null;
  readonly auditRemarks?: string | null;
  readonly auditRecommendation?: string | null;
  readonly result: TestActResult;
  readonly comment?: string | null;
  readonly confirmedBy: string;
  readonly confirmedAt: string;
  readonly sentAt?: string | null;
}

export class TestActValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestActValidationError";
  }
}

/**
 * Creates a confirmed act. Only fields already approved by a human reach the domain
 * (not a raw AI draft): a definite result and a link to a deal are required.
 */
export function createTestAct(input: CreateTestActInput): TestAct {
  if (input.dealId.trim() === "") {
    throw new TestActValidationError("The act must be linked to a deal");
  }
  if (input.result === "unknown") {
    throw new TestActValidationError("Specify the test result: successful or unsuccessful");
  }

  return {
    id: input.id,
    dealId: input.dealId,
    techRequestId: input.techRequestId ?? null,
    actKind: input.actKind ?? "workup",
    clientName: input.clientName ?? null,
    equipment: input.equipment ?? null,
    productName: input.productName ?? null,
    dosage: input.dosage ?? null,
    processParams: input.processParams ?? null,
    recommendation: input.recommendation ?? null,
    auditChecked: input.auditChecked ?? null,
    auditRemarks: input.auditRemarks ?? null,
    auditRecommendation: input.auditRecommendation ?? null,
    result: input.result,
    comment: input.comment ?? null,
    confirmedBy: input.confirmedBy,
    confirmedAt: input.confirmedAt,
    sentAt: input.sentAt ?? null,
  };
}

/** Marks the act as sent to the manager. */
export function markActSent(act: TestAct, sentAt: string): TestAct {
  return { ...act, sentAt };
}
