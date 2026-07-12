import { describe, expect, it } from "vitest";
import { createOnboarding } from "@/domain/onboarding/onboarding";
import { makeId } from "@/domain/shared/id";
import { InMemoryOnboardingRepository } from "@/infrastructure/persistence/in-memory-onboarding-repository";
import { makeSetOnboardingDoc } from "./onboardings";

function repoWith(...seed: Parameters<typeof createOnboarding>[0][]) {
  const onboardings = new InMemoryOnboardingRepository(seed.map(createOnboarding));
  return onboardings;
}

const DOC = "EIN certificate";

describe("makeSetOnboardingDoc", () => {
  it("marks the document and persists it in the repository (survives a reload)", async () => {
    const onboardings = repoWith({
      id: makeId<"OnboardingId">("o1"),
      clientName: "Test LLC",
      requestedBy: "m1",
      createdAt: "2026-06-28T00:00:00.000Z",
    });
    const setDoc = makeSetOnboardingDoc({ onboardings });

    const updated = await setDoc({
      id: makeId<"OnboardingId">("o1"),
      docName: DOC,
      collected: true,
    });
    expect(updated.documents.find((d) => d.name === DOC)?.collected).toBe(true);

    const reloaded = await onboardings.findById(makeId<"OnboardingId">("o1"));
    expect(reloaded?.documents.find((d) => d.name === DOC)?.collected).toBe(true);
  });

  it("throws if the onboarding is not found", async () => {
    const onboardings = new InMemoryOnboardingRepository([]);
    const setDoc = makeSetOnboardingDoc({ onboardings });
    await expect(
      setDoc({ id: makeId<"OnboardingId">("missing"), docName: DOC, collected: true }),
    ).rejects.toThrow();
  });
});
