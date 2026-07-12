import { describe, expect, it } from "vitest";
import type { OnboardingStatus } from "./onboarding";
import {
  DEFAULT_ONBOARDING_FILTER,
  isOnboardingFilter,
  matchesOnboardingFilter,
  parseOnboardingFilter,
} from "./onboarding-filter";

const at = (status: OnboardingStatus) => ({ status });

describe("parseOnboardingFilter", () => {
  it("passes valid values through", () => {
    expect(parseOnboardingFilter("collecting")).toBe("collecting");
    expect(parseOnboardingFilter("legal_review")).toBe("legal_review");
    expect(parseOnboardingFilter("approved")).toBe("approved");
    expect(parseOnboardingFilter("rejected")).toBe("rejected");
  });

  it("unknown/empty → default", () => {
    expect(parseOnboardingFilter("bogus")).toBe(DEFAULT_ONBOARDING_FILTER);
    expect(parseOnboardingFilter(undefined)).toBe(DEFAULT_ONBOARDING_FILTER);
  });
});

describe("isOnboardingFilter", () => {
  it("recognizes valid values and rejects the rest", () => {
    expect(isOnboardingFilter("approved")).toBe(true);
    expect(isOnboardingFilter("rejected")).toBe(true);
    expect(isOnboardingFilter("bogus")).toBe(false);
    expect(isOnboardingFilter(null)).toBe(false);
  });
});

describe("matchesOnboardingFilter", () => {
  it("all passes any status", () => {
    expect(matchesOnboardingFilter("all", at("collecting"))).toBe(true);
    expect(matchesOnboardingFilter("all", at("rejected"))).toBe(true);
  });

  it("collecting — only while collecting", () => {
    expect(matchesOnboardingFilter("collecting", at("collecting"))).toBe(true);
    expect(matchesOnboardingFilter("collecting", at("legal_review"))).toBe(false);
    expect(matchesOnboardingFilter("collecting", at("rejected"))).toBe(false);
  });

  it("legal_review — only with legal", () => {
    expect(matchesOnboardingFilter("legal_review", at("legal_review"))).toBe(true);
    expect(matchesOnboardingFilter("legal_review", at("approved"))).toBe(false);
  });

  it("approved — only approved ones", () => {
    expect(matchesOnboardingFilter("approved", at("approved"))).toBe(true);
    expect(matchesOnboardingFilter("approved", at("collecting"))).toBe(false);
  });

  it("rejected — only ones needing rework", () => {
    expect(matchesOnboardingFilter("rejected", at("rejected"))).toBe(true);
    expect(matchesOnboardingFilter("rejected", at("collecting"))).toBe(false);
  });
});
