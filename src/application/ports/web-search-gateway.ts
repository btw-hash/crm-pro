/**
 * Boundary with external web search. The sales head's assistant uses it to answer
 * questions beyond the CRM snapshot (e.g. "find confectioners in Denver"). Real
 * implementations live in infrastructure; the stub is a deterministic placeholder.
 * Selected via the WEB_SEARCH_MODE env var (like AI_MODE). Data-protection guard:
 * the search query must NOT contain PII/trade secrets — it's sanitized before the
 * call (the application layer passes only the analytical/public part of the
 * question).
 */

/** A single search result. */
export interface WebSearchResult {
  readonly title: string;
  readonly snippet: string;
  /** Source — URL of the page found by the search. Shown to the user. */
  readonly url: string;
}

/** Web search response: up to 5 results. */
export interface WebSearchResponse {
  readonly query: string;
  readonly results: readonly WebSearchResult[];
}

export interface WebSearchGateway {
  /**
   * Search the open internet. The query must be public/analytical (no PII, prices,
   * or client tax IDs) — enforced at the use-case level.
   */
  search(query: string): Promise<WebSearchResponse>;
}
