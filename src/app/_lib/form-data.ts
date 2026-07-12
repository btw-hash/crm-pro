/**
 * Pure `FormData` parsers for server actions. Extracted from "use server" files (which
 * can't be unit-tested in isolation — they pull in the container/next-cache) into a
 * plain module, so locale-number parsing and string filtering can be covered by tests
 * without duplicating them in every actions.ts. See also the `transcribe/validate.ts` pattern.
 */

/** Number from a form field, supporting a comma as the decimal separator ("12,5" → 12.5). */
export function formNumber(formData: FormData, name: string): number {
  return Number(String(formData.get(name) ?? "").replace(",", "."));
}

/** Multiline field → array of non-empty lines (trimmed, empties dropped). */
export function formLines(formData: FormData, name: string): string[] {
  const value = formData.get(name);
  if (typeof value !== "string") return [];
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Text from a field; an empty/whitespace-only string → null. */
export function formText(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}
