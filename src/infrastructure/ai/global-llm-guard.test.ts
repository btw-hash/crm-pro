import { describe, expect, it } from "vitest";
import { assertProviderCompliant, GlobalLlmInProductionError } from "./global-llm-guard";

const base = {
  mode: "live",
  provider: "anthropic",
  isProduction: true,
  allowGlobal: false,
} as const;

describe("assertProviderCompliant", () => {
  it("blocks a global LLM in production without explicit permission", () => {
    expect(() => assertProviderCompliant(base)).toThrow(GlobalLlmInProductionError);
  });

  it("allows a global LLM in production when ALLOW_GLOBAL_LLM=true", () => {
    expect(() => assertProviderCompliant({ ...base, allowGlobal: true })).not.toThrow();
  });

  it("the compliant provider is always allowed in production", () => {
    expect(() => assertProviderCompliant({ ...base, provider: "openai" })).not.toThrow();
  });

  it("outside production a global LLM is not blocked (dev/demo)", () => {
    expect(() => assertProviderCompliant({ ...base, isProduction: false })).not.toThrow();
  });

  it("stub mode never checks anything", () => {
    expect(() => assertProviderCompliant({ ...base, mode: "stub" })).not.toThrow();
  });
});
