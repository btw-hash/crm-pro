import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import {
  allDocsCollected,
  approveOnboarding,
  createOnboarding,
  type CreateOnboardingInput,
  DEFAULT_ONBOARDING_DOCS,
  isOnboardingApproved,
  OnboardingError,
  rejectOnboarding,
  setDocumentCollected,
  submitToLegal,
} from "./onboarding";

const base: CreateOnboardingInput = {
  id: makeId<"OnboardingId">("o1"),
  clientName: "New Client LLC",
  ein: "3901000001",
  requestedBy: "manager-owens",
  createdAt: "2026-06-25T10:00:00.000Z",
};

const allDocs = { ...base, collectedDocs: DEFAULT_ONBOARDING_DOCS };

describe("createOnboarding", () => {
  it("creates in 'Collecting documents' with the standard package", () => {
    const onb = createOnboarding(base);
    expect(onb.status).toBe("collecting");
    expect(onb.documents).toHaveLength(DEFAULT_ONBOARDING_DOCS.length);
    expect(onb.documents.every((d) => !d.collected)).toBe(true);
  });

  it("marks collected documents and rejects an empty name", () => {
    expect(allDocsCollected(createOnboarding(allDocs))).toBe(true);
    expect(() => createOnboarding({ ...base, clientName: " " })).toThrow(OnboardingError);
  });
});

describe("onboarding workflow", () => {
  it("cannot be sent to legal until all documents are collected", () => {
    expect(() => submitToLegal(createOnboarding(base))).toThrow(OnboardingError);
  });

  it("collected → sent to legal → approved", () => {
    let onb = submitToLegal(createOnboarding(allDocs));
    expect(onb.status).toBe("legal_review");
    onb = approveOnboarding(onb);
    expect(onb.status).toBe("approved");
    expect(isOnboardingApproved(onb.status)).toBe(true);
  });

  it("legal rejects with a resolution note, then it can be resent", () => {
    let onb = submitToLegal(createOnboarding(allDocs));
    onb = rejectOnboarding(onb, "Need a fresh registration certificate");
    expect(onb.status).toBe("rejected");
    expect(onb.legalNote).toContain("registration certificate");
    onb = submitToLegal(onb); // from rework — back to legal
    expect(onb.status).toBe("legal_review");
  });

  it("only a package under review can be approved", () => {
    expect(() => approveOnboarding(createOnboarding(allDocs))).toThrow(OnboardingError);
  });
});

describe("setDocumentCollected — finish collecting documents", () => {
  const someDoc = "EIN certificate"; // part of DEFAULT_ONBOARDING_DOCS

  it("marks a single document as collected, leaves the rest untouched", () => {
    const onb = setDocumentCollected(createOnboarding(base), someDoc, true);
    expect(onb.documents.find((d) => d.name === someDoc)?.collected).toBe(true);
    expect(onb.documents.filter((d) => d.collected)).toHaveLength(1);
  });

  it("unmarks (collected=false)", () => {
    const collected = setDocumentCollected(createOnboarding(base), someDoc, true);
    const cleared = setDocumentCollected(collected, someDoc, false);
    expect(cleared.documents.find((d) => d.name === someDoc)?.collected).toBe(false);
  });

  it("allows finishing collection during rework (rejected)", () => {
    const rejected = rejectOnboarding(submitToLegal(createOnboarding(allDocs)), "redo it");
    const onb = setDocumentCollected(rejected, someDoc, false);
    expect(onb.documents.find((d) => d.name === someDoc)?.collected).toBe(false);
  });

  it("cannot change documents after sending to legal", () => {
    const review = submitToLegal(createOnboarding(allDocs));
    expect(() => setDocumentCollected(review, someDoc, false)).toThrow(OnboardingError);
  });

  it("rejects a document not in the package", () => {
    expect(() => setDocumentCollected(createOnboarding(base), "Dog's passport", true)).toThrow(
      OnboardingError,
    );
  });

  it("marking every document one by one makes the package ready to send", () => {
    let onb = createOnboarding(base);
    for (const name of DEFAULT_ONBOARDING_DOCS) {
      onb = setDocumentCollected(onb, name, true);
    }
    expect(allDocsCollected(onb)).toBe(true);
    expect(submitToLegal(onb).status).toBe("legal_review"); // ready to send
  });
});
