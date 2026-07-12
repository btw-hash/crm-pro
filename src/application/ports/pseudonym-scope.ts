/**
 * Known PII/identifiers of the current request that get masked before being sent
 * to the LLM: contact/manager full names (exact match + inflections) and tax
 * IDs/legal-entity ids (excluded from phone-number detection). Assembled by the
 * use-case from data the assistant already has access to (CRM snapshot/clients/
 * contacts) — NOT stored globally.
 */
export interface KnownPii {
  /** Full names of contacts and employees (for masking as [CONTACT_N]). */
  readonly contacts: readonly string[];
  /** Tax IDs / legal-entity ids (excluded from the phone-number regex). */
  readonly taxIds: readonly string[];
}

/**
 * Per-request scope of known PII for the LLM pseudonymizer.
 *
 * The pseudonymizer (`PseudonymizingLlmProvider`) is a global singleton, while PII
 * is per-request (depends on the data the current user can see). This port connects
 * them: the use-case gathers the request's PII and makes its AI calls inside `run`,
 * and the pseudonymizer reads it via `current()`. The infrastructure implementation
 * (`AsyncLocalStorage`) isolates concurrent request contexts.
 */
export interface PseudonymScope {
  /** Run `fn` with an active set of known PII (visible to nested AI calls). */
  run<T>(pii: KnownPii, fn: () => Promise<T>): Promise<T>;
  /** Known PII for the current request (or null outside of `run`). */
  current(): KnownPii | null;
}
