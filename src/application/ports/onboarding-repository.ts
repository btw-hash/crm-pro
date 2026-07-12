import type { Onboarding, OnboardingId } from "@/domain/onboarding/onboarding";

export interface OnboardingRepository {
  save(onboarding: Onboarding): Promise<void>;
  findById(id: OnboardingId): Promise<Onboarding | null>;
  /** All onboardings, newest first. */
  list(): Promise<readonly Onboarding[]>;
}
