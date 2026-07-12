import type { TestActDraft } from "@/application/ports/ai-gateway";

/**
 * Which test-act draft fields the AI failed to extract — the user fills them in
 * manually. Shared logic for the stub and the live gateway, so they don't drift apart.
 */
export function missingActFields(draft: Omit<TestActDraft, "missingFields">): string[] {
  const missing: string[] = [];
  if (!draft.clientName) missing.push("clientName");
  if (!draft.productName) missing.push("productName");
  if (!draft.dosage) missing.push("dosage");
  if (!draft.processParams) missing.push("processParams");
  if (draft.result === "unknown") missing.push("result");
  return missing;
}
