import type { OnboardingRepository } from "@/application/ports/onboarding-repository";
import {
  approveOnboarding,
  createOnboarding,
  type CreateOnboardingInput,
  type Onboarding,
  OnboardingError,
  type OnboardingId,
  rejectOnboarding,
  setDocumentCollected,
  submitToLegal,
} from "@/domain/onboarding/onboarding";

export type ListOnboardings = () => Promise<readonly Onboarding[]>;

/** New client onboardings (newest first). */
export function makeListOnboardings(deps: { onboardings: OnboardingRepository }): ListOnboardings {
  return () => deps.onboardings.list();
}

export type StartOnboarding = (input: CreateOnboardingInput) => Promise<Onboarding>;

/** Starts a new client onboarding (document collection). */
export function makeStartOnboarding(deps: { onboardings: OnboardingRepository }): StartOnboarding {
  return async (input) => {
    const onboarding = createOnboarding(input);
    await deps.onboardings.save(onboarding);
    return onboarding;
  };
}

export type OnboardingTransition = (input: {
  id: OnboardingId;
  note?: string;
}) => Promise<Onboarding>;

async function load(deps: { onboardings: OnboardingRepository }, id: OnboardingId) {
  const onboarding = await deps.onboardings.findById(id);
  if (!onboarding) {
    throw new OnboardingError("Onboarding not found");
  }
  return onboarding;
}

/** Submits the package to legal (from collection/rework, once documents are collected). */
export function makeSubmitOnboarding(deps: {
  onboardings: OnboardingRepository;
}): OnboardingTransition {
  return async ({ id }) => {
    const next = submitToLegal(await load(deps, id));
    await deps.onboardings.save(next);
    return next;
  };
}

/** Legal approved the package. */
export function makeApproveOnboarding(deps: {
  onboardings: OnboardingRepository;
}): OnboardingTransition {
  return async ({ id }) => {
    const next = approveOnboarding(await load(deps, id));
    await deps.onboardings.save(next);
    return next;
  };
}

/** Legal rejected the package for rework (with a resolution note). */
export function makeRejectOnboarding(deps: {
  onboardings: OnboardingRepository;
}): OnboardingTransition {
  return async ({ id, note }) => {
    const next = rejectOnboarding(await load(deps, id), note ?? "");
    await deps.onboardings.save(next);
    return next;
  };
}

export type SetOnboardingDoc = (input: {
  id: OnboardingId;
  docName: string;
  collected: boolean;
}) => Promise<Onboarding>;

/** Marks/unmarks a document in the package (to finish collecting during collection/rework). */
export function makeSetOnboardingDoc(deps: {
  onboardings: OnboardingRepository;
}): SetOnboardingDoc {
  return async ({ id, docName, collected }) => {
    const next = setDocumentCollected(await load(deps, id), docName, collected);
    await deps.onboardings.save(next);
    return next;
  };
}
