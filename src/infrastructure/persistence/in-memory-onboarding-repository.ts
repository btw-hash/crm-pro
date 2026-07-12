import type { OnboardingRepository } from "@/application/ports/onboarding-repository";
import type { Onboarding, OnboardingId } from "@/domain/onboarding/onboarding";

export class InMemoryOnboardingRepository implements OnboardingRepository {
  private readonly items = new Map<OnboardingId, Onboarding>();

  constructor(seed: readonly Onboarding[] = []) {
    for (const onboarding of seed) {
      this.items.set(onboarding.id, onboarding);
    }
  }

  async save(onboarding: Onboarding): Promise<void> {
    this.items.set(onboarding.id, onboarding);
  }

  async findById(id: OnboardingId): Promise<Onboarding | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<readonly Onboarding[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
