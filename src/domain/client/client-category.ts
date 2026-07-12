/** ABC client category by contribution/potential. */
export const CLIENT_CATEGORIES = ["A", "B", "C"] as const;

export type ClientCategory = (typeof CLIENT_CATEGORIES)[number];

export function isClientCategory(value: unknown): value is ClientCategory {
  return typeof value === "string" && (CLIENT_CATEGORIES as readonly string[]).includes(value);
}
