import type { PseudonymScope } from "@/application/ports/pseudonym-scope";
import type {
  CompleteTextRequest,
  ExtractJsonRequest,
  LlmProvider,
  LlmResult,
} from "./llm/llm-provider";
import { pseudonymize } from "./pseudonymize";

/** Pseudonymizer options: static lists and/or a per-request PII scope. */
export interface PseudonymizingLlmProviderOptions {
  /** Known contact full names (static; usually empty — PII is supplied per-request via scope). */
  readonly knownContacts?: readonly string[];
  /** Known legal-entity tax IDs (static; excluded from phone-number detection, #296). */
  readonly knownTaxIds?: readonly string[];
  /**
   * Per-request scope of known PII (the CRM snapshot/clients/contacts of a specific
   * request). The pseudonymizer is global, PII is per-request; the scope connects
   * them. The request's lists are MERGED with the static ones.
   */
  readonly scope?: PseudonymScope;
}

/**
 * Decorator over any `LlmProvider`: masks PII (phone numbers/known full names/tax IDs)
 * in the user text BEFORE sending it to the model and puts the originals back in the
 * response. Data minimization — raw PII never reaches the LLM (a plus even for a
 * data-residency-compliant provider).
 *
 * Known full names/tax IDs come from two sources and are MERGED: the static lists
 * from the constructor and the per-request `scope` (this specific request's PII — the
 * CRM snapshot visible to the user). This way a global singleton provider masks
 * exactly the names that would actually reach the model for this request.
 */
export class PseudonymizingLlmProvider implements LlmProvider {
  private readonly knownContacts: readonly string[];
  private readonly knownTaxIds: readonly string[];
  private readonly scope: PseudonymScope | undefined;

  constructor(
    private readonly inner: LlmProvider,
    options: PseudonymizingLlmProviderOptions = {},
  ) {
    this.knownContacts = options.knownContacts ?? [];
    this.knownTaxIds = options.knownTaxIds ?? [];
    this.scope = options.scope;
  }

  /** Known PII for the current call: static lists + the active per-request scope's PII. */
  private resolvePii(): { contacts: readonly string[]; taxIds: readonly string[] } {
    const fromScope = this.scope?.current();
    return {
      contacts: [...this.knownContacts, ...(fromScope?.contacts ?? [])],
      taxIds: [...this.knownTaxIds, ...(fromScope?.taxIds ?? [])],
    };
  }

  async extractJson(request: ExtractJsonRequest): Promise<unknown> {
    const { contacts, taxIds } = this.resolvePii();
    const { text, restore } = pseudonymize(request.user, contacts, taxIds);
    const result = await this.inner.extractJson({ ...request, user: text });
    return restoreDeep(result, restore);
  }

  async completeText(request: CompleteTextRequest): Promise<string> {
    const { contacts, taxIds } = this.resolvePii();
    const { text, restore } = pseudonymize(request.user, contacts, taxIds);
    return restore(await this.inner.completeText({ ...request, user: text }));
  }

  async extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>> {
    const { contacts, taxIds } = this.resolvePii();
    const { text, restore } = pseudonymize(request.user, contacts, taxIds);
    const { value, usage } = await this.inner.extractJsonWithUsage({ ...request, user: text });
    return { value: restoreDeep(value, restore), usage };
  }

  async completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>> {
    const { contacts, taxIds } = this.resolvePii();
    const { text, restore } = pseudonymize(request.user, contacts, taxIds);
    const { value, usage } = await this.inner.completeTextWithUsage({ ...request, user: text });
    return { value: restore(value), usage };
  }
}

/** Restores the originals in every string value of the model's response. */
function restoreDeep(value: unknown, restore: (s: string) => string): unknown {
  if (typeof value === "string") {
    return restore(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => restoreDeep(item, restore));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, restoreDeep(val, restore)]),
    );
  }
  return value;
}
