import type { Id } from "@/domain/shared/id";

export type OnboardingId = Id<"OnboardingId">;

/** New client onboarding stages: document collection → legal review → decision. */
export type OnboardingStatus = "collecting" | "legal_review" | "approved" | "rejected";

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  collecting: "Collecting documents",
  legal_review: "Under legal review",
  approved: "Approved",
  rejected: "Rejected (needs rework)",
};

/** A document in the onboarding package and whether it's been collected. */
export interface OnboardingDoc {
  readonly name: string;
  readonly collected: boolean;
}

/** Standard document package for a new counterparty. */
export const DEFAULT_ONBOARDING_DOCS: readonly string[] = [
  "Company profile",
  "Business registration certificate",
  "Articles of incorporation",
  "EIN certificate",
  "Power of attorney for signatory",
  "Bank details",
];

export interface Onboarding {
  readonly id: OnboardingId;
  readonly clientName: string;
  readonly ein: string | null;
  readonly status: OnboardingStatus;
  readonly documents: readonly OnboardingDoc[];
  readonly requestedBy: string;
  /** Legal counsel's resolution (on rejection — what to rework). */
  readonly legalNote: string | null;
  readonly createdAt: string;
}

export class OnboardingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OnboardingError";
  }
}

export interface CreateOnboardingInput {
  readonly id: OnboardingId;
  readonly clientName: string;
  readonly ein?: string | null;
  /** Collected documents (names); the rest of the standard package are marked uncollected. */
  readonly collectedDocs?: readonly string[];
  readonly requestedBy: string;
  readonly createdAt: string;
}

/** Creates a new client onboarding at the "Collecting documents" stage. */
export function createOnboarding(input: CreateOnboardingInput): Onboarding {
  if (input.clientName.trim() === "") {
    throw new OnboardingError("Enter the client name");
  }
  const collected = new Set(input.collectedDocs ?? []);
  return {
    id: input.id,
    clientName: input.clientName.trim(),
    ein: input.ein?.trim() || null,
    status: "collecting",
    documents: DEFAULT_ONBOARDING_DOCS.map((name) => ({ name, collected: collected.has(name) })),
    requestedBy: input.requestedBy,
    legalNote: null,
    createdAt: input.createdAt,
  };
}

/** Whether every document in the package has been collected. */
export function allDocsCollected(onboarding: Onboarding): boolean {
  return onboarding.documents.every((doc) => doc.collected);
}

/** Whether onboarding is complete (approved) — the client can now be created. */
export function isOnboardingApproved(status: OnboardingStatus): boolean {
  return status === "approved";
}

/** Sends the package to legal — only from "Collecting"/rework and only when all documents are collected. */
export function submitToLegal(onboarding: Onboarding): Onboarding {
  if (onboarding.status !== "collecting" && onboarding.status !== "rejected") {
    throw new OnboardingError(
      `Only a package that is collecting/needs rework can be sent to legal, but it is "${ONBOARDING_STATUS_LABELS[onboarding.status]}"`,
    );
  }
  if (!allDocsCollected(onboarding)) {
    throw new OnboardingError("Not all documents are collected");
  }
  return { ...onboarding, status: "legal_review", legalNote: null };
}

/** Legal counsel approved the package. */
export function approveOnboarding(onboarding: Onboarding): Onboarding {
  if (onboarding.status !== "legal_review") {
    throw new OnboardingError("Only a package under legal review can be approved");
  }
  return { ...onboarding, status: "approved" };
}

/** Legal counsel rejected the package for rework (with a resolution note). */
export function rejectOnboarding(onboarding: Onboarding, note: string): Onboarding {
  if (onboarding.status !== "legal_review") {
    throw new OnboardingError("Only a package under legal review can be rejected");
  }
  return { ...onboarding, status: "rejected", legalNote: note.trim() || "Rework required" };
}

/**
 * Marks/unmarks a document in the package — only at the collecting or rework stage.
 * Once sent to legal (legal_review) and approved, the package is no longer editable.
 * This lets the manager finish collecting documents over time instead of supplying
 * them all at once at creation.
 */
export function setDocumentCollected(
  onboarding: Onboarding,
  docName: string,
  collected: boolean,
): Onboarding {
  if (onboarding.status !== "collecting" && onboarding.status !== "rejected") {
    throw new OnboardingError(
      `Documents can only be marked while collecting/needing rework, but the package is "${ONBOARDING_STATUS_LABELS[onboarding.status]}"`,
    );
  }
  if (!onboarding.documents.some((doc) => doc.name === docName)) {
    throw new OnboardingError(`Document "${docName}" is not part of the package`);
  }
  return {
    ...onboarding,
    documents: onboarding.documents.map((doc) =>
      doc.name === docName ? { ...doc, collected } : doc,
    ),
  };
}
