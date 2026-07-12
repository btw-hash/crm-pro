import { describe, expect, it, vi } from "vitest";
import type { KnownPii, PseudonymScope } from "@/application/ports/pseudonym-scope";
import type { CompleteTextRequest, ExtractJsonRequest, LlmProvider } from "./llm/llm-provider";
import { PseudonymizingLlmProvider } from "./pseudonymizing-llm-provider";

/** A test scope with no AsyncLocalStorage: holds one active set of PII. */
function fixedScope(pii: KnownPii | null): PseudonymScope {
  return {
    run: async (_pii, fn) => fn(),
    current: () => pii,
  };
}

/**
 * Stubs for the *WithUsage methods: these tests check the older extractJson/completeText
 * (masking/restoring); the usage channel is covered separately. A fresh object per call.
 */
const usageStubs = () => ({
  extractJsonWithUsage: vi.fn().mockResolvedValue({ value: undefined, usage: null }),
  completeTextWithUsage: vi.fn().mockResolvedValue({ value: "", usage: null }),
});

describe("PseudonymizingLlmProvider", () => {
  it("masks a phone number before sending and restores it in extractJson's response", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(async (req: ExtractJsonRequest) => {
        seenByModel = req.user;
        // the model "returned" a field containing the placeholder
        return { comment: req.user };
      }),
      completeText: vi.fn(),
      ...usageStubs(),
    };
    const provider = new PseudonymizingLlmProvider(inner);

    const result = (await provider.extractJson({
      system: "s",
      user: "Call back at +1 (212) 555-0134",
      toolName: "t",
      toolDescription: "d",
      schema: {},
    })) as { comment: string };

    expect(seenByModel).toContain("[PHONE_1]"); // the model saw a placeholder
    expect(seenByModel).not.toContain("555-0134");
    expect(result.comment).toContain("+1 (212) 555-0134"); // the response has the original
  });

  it("masks and restores in completeText; the full name comes from static knownContacts", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(),
      completeText: vi.fn(async (req: CompleteTextRequest) => {
        seenByModel = req.user;
        return `Ready for ${req.user}`;
      }),
      ...usageStubs(),
    };
    const provider = new PseudonymizingLlmProvider(inner, { knownContacts: ["Marina Foster"] });

    const out = await provider.completeText({ system: "s", user: "Proposal for Marina Foster" });

    expect(seenByModel).toBe("Proposal for [CONTACT_1]"); // the model saw a placeholder
    expect(out).toBe("Ready for Proposal for Marina Foster"); // the response has the original restored
  });

  it("a known tax ID reaches the model unaltered (not [PHONE]); a full name in possessive form is masked", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(),
      completeText: vi.fn(async (req: CompleteTextRequest) => {
        seenByModel = req.user;
        return req.user;
      }),
      ...usageStubs(),
    };
    const provider = new PseudonymizingLlmProvider(inner, {
      knownContacts: ["Marina Foster"],
      knownTaxIds: ["7707083893"],
    });

    const out = await provider.completeText({
      system: "s",
      user: "Tax ID 7707083893, confirm with Marina Foster's team.",
    });

    expect(seenByModel).toContain("7707083893"); // the tax ID wasn't substituted
    expect(seenByModel).not.toContain("[PHONE");
    expect(seenByModel).not.toContain("Marina"); // the possessive full name was masked
    expect(out).toBe("Tax ID 7707083893, confirm with Marina Foster's team."); // round-trip
  });

  // --- per-request scope (#282/#296): PII per request, not static ---

  it("masks a full name from the per-request scope (names arrive per request, not from the constructor)", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(),
      completeText: vi.fn(async (req: CompleteTextRequest) => {
        seenByModel = req.user;
        return req.user;
      }),
      ...usageStubs(),
    };
    const provider = new PseudonymizingLlmProvider(inner, {
      scope: fixedScope({ contacts: ["John Carter"], taxIds: [] }),
    });

    const out = await provider.completeText({ system: "s", user: "Called Carter about the deal." });

    expect(seenByModel).not.toContain("Carter"); // the full name from scope was masked
    expect(seenByModel).toContain("[CONTACT_1]");
    expect(out).toBe("Called Carter about the deal."); // round-trip restored the original
  });

  it("merges the static lists and the scope's PII", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(),
      completeText: vi.fn(async (req: CompleteTextRequest) => {
        seenByModel = req.user;
        return req.user;
      }),
      ...usageStubs(),
    };
    const provider = new PseudonymizingLlmProvider(inner, {
      knownContacts: ["Marina Foster"],
      scope: fixedScope({ contacts: ["John Carter"], taxIds: ["7707083893"] }),
    });

    await provider.completeText({
      system: "s",
      user: "Marina Foster and John Carter, tax ID 7707083893.",
    });

    expect(seenByModel).not.toContain("Marina"); // static full name
    expect(seenByModel).not.toContain("Carter"); // full name from scope
    expect(seenByModel).toContain("7707083893"); // tax ID from scope, not a phone number
    expect(seenByModel).not.toContain("[PHONE");
  });

  it("with no active scope (current=null) it works off the static lists and phone numbers", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(),
      completeText: vi.fn(async (req: CompleteTextRequest) => {
        seenByModel = req.user;
        return req.user;
      }),
      ...usageStubs(),
    };
    const provider = new PseudonymizingLlmProvider(inner, { scope: fixedScope(null) });

    await provider.completeText({ system: "s", user: "Call back at +1 (212) 555-0134." });

    expect(seenByModel).toContain("[PHONE_1]");
    expect(seenByModel).not.toContain("555-0134");
  });

  // --- usage channel (#216): *WithUsage masks value and passes usage through unchanged ---

  it("completeTextWithUsage restores originals in value and passes usage through", async () => {
    let seenByModel = "";
    const inner: LlmProvider = {
      extractJson: vi.fn(),
      completeText: vi.fn(),
      extractJsonWithUsage: vi.fn(),
      completeTextWithUsage: vi.fn(async (req: CompleteTextRequest) => {
        seenByModel = req.user;
        return {
          value: req.user,
          usage: {
            inputTokens: 10,
            outputTokens: 5,
            totalTokens: 15,
            estimated: false,
          },
        };
      }),
    };
    const provider = new PseudonymizingLlmProvider(inner, { knownContacts: ["Marina Foster"] });

    const { value, usage } = await provider.completeTextWithUsage({
      system: "s",
      user: "Message for Marina Foster",
    });

    expect(seenByModel).toBe("Message for [CONTACT_1]"); // the model saw a placeholder
    expect(value).toBe("Message for Marina Foster"); // the original was restored
    expect(usage).toEqual({ inputTokens: 10, outputTokens: 5, totalTokens: 15, estimated: false });
  });
});
