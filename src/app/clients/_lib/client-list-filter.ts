import {
  matchesClientFilter,
  type ClientFilter,
  type ClientFilterFacts,
} from "@/domain/client/client-filter";
import type { Client } from "@/domain/client/client";

/** Client + its original index (for aligning with `balances`/the avatar palette). */
export interface IndexedClient {
  readonly client: Client;
  readonly index: number;
}

/** What we need to know about a client to build filter facts (from presentation data). */
export interface ClientFilterSource {
  readonly client: Client;
  /** Whether the credit limit is exceeded (from the ERP balance; no balance/no access → false). */
  readonly isOverLimit: boolean;
  /** Number of the client's deals. */
  readonly dealCount: number;
}

/** Filter facts for a client — a single source for both counters and filtering. */
export function toFilterFacts(source: ClientFilterSource): ClientFilterFacts {
  return {
    category: source.client.category,
    isOverLimit: source.isOverLimit,
    dealCount: source.dealCount,
  };
}

/**
 * Chip counters for each filter (including "All"). Computed from exactly the same facts
 * the list is later filtered by — so counts never drift from the actual result set.
 */
export function countByFilter(
  sources: readonly ClientFilterSource[],
  filters: readonly ClientFilter[],
): Record<ClientFilter, number> {
  const facts = sources.map(toFilterFacts);
  const counts = {} as Record<ClientFilter, number>;
  for (const filter of filters) {
    counts[filter] = facts.filter((fact) => matchesClientFilter(filter, fact)).length;
  }
  return counts;
}

/**
 * Clients matching the active filter, keeping their original index. `all` returns
 * everyone. This is what "the page returns a filtered set by the `?filter=` param" means.
 */
export function selectVisibleClients(
  sources: readonly ClientFilterSource[],
  filter: ClientFilter,
): readonly IndexedClient[] {
  return sources
    .map((source, index) => ({ source, index }))
    .filter(({ source }) => matchesClientFilter(filter, toFilterFacts(source)))
    .map(({ source, index }) => ({ client: source.client, index }));
}
