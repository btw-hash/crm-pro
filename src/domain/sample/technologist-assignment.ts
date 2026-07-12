/**
 * Deterministic round-robin routing of test requests among technologists.
 * A pure function: no random/time/IO — so the distribution is reproducible
 * and covered by unit tests (issue #6). "Who's next" is computed from the
 * last assigned technologist, and the list of technologists is external
 * input (config), not a domain hardcode.
 */

export class NoTechnologistsError extends Error {
  constructor() {
    super("No technologist available to assign the test to");
    this.name = "NoTechnologistsError";
  }
}

/**
 * Returns the next technologist in the round after the last one assigned:
 * - empty list → {@link NoTechnologistsError};
 * - no previous one set (or it's no longer in the list) → the first technologist;
 * - otherwise the one after the previous, wrapping around the end of the list.
 */
export function pickNextTechnologist(
  technologists: readonly string[],
  lastAssignedId?: string | null,
): string {
  const first = technologists[0];
  if (first === undefined) {
    throw new NoTechnologistsError();
  }
  if (!lastAssignedId) {
    return first;
  }
  const lastIndex = technologists.indexOf(lastAssignedId);
  if (lastIndex === -1) {
    return first;
  }
  // The index stays in bounds via modulo; `?? first` is only to satisfy
  // noUncheckedIndexedAccess without an unnecessary non-null assertion.
  return technologists[(lastIndex + 1) % technologists.length] ?? first;
}
