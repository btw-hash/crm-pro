import type { TechRequest } from "@/domain/tech-request/tech-request";

/** Values for the tech queue's `?filter=` param (first — default, param is omitted). */
export type TechQueueFilter = "all" | "open" | "in_progress" | "demo";

export interface TechQueueFilterChip {
  readonly label: string;
  readonly value: TechQueueFilter;
}

/** Filter chips in display order. */
export const TECH_QUEUE_FILTER_CHIPS: readonly TechQueueFilterChip[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Demo and tests", value: "demo" },
];

/** Normalizes an arbitrary URL string to a valid filter value. */
export function toTechQueueFilter(raw: string | undefined): TechQueueFilter {
  return TECH_QUEUE_FILTER_CHIPS.some((c) => c.value === raw) ? (raw as TechQueueFilter) : "all";
}

/** The request fields the filter needs (status and kind are enough). */
type FilterableRequest = Pick<TechRequest, "status" | "kind">;

export function matchesTechQueueFilter(req: FilterableRequest, filter: TechQueueFilter): boolean {
  switch (filter) {
    case "open":
      return req.status === "open";
    case "in_progress":
      return req.status === "in_progress";
    case "demo":
      return req.kind === "demo";
    default:
      return true;
  }
}

export function filterTechRequests<T extends FilterableRequest>(
  requests: readonly T[],
  filter: TechQueueFilter,
): T[] {
  return requests.filter((r) => matchesTechQueueFilter(r, filter));
}
