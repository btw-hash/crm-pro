/**
 * Client list search (the "Search clients" field on `/clients`).
 *
 * Searches by company name: case-insensitive, substring match, with whitespace
 * trimmed from the ends. An empty/whitespace query doesn't filter anything
 * (show everyone). Single source of truth for filtering and counters — a pure
 * function; the presentation layer passes it the name and the normalized query.
 */

/** Normalizes a raw `?q=` value into a search query (trim + lower). Empty → "". */
export function normalizeClientQuery(raw: string | undefined | null): string {
  return (raw ?? "").trim().toLowerCase();
}

/**
 * Does the client name match the search query. The query is expected to already
 * be normalized (see `normalizeClientQuery`). An empty query passes everyone.
 */
export function matchesClientQuery(name: string, normalizedQuery: string): boolean {
  if (normalizedQuery === "") return true;
  return name.toLowerCase().includes(normalizedQuery);
}
