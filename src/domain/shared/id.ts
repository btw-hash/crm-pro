/**
 * Branded identifiers: prevent mixing up ClientId and ProductId, even
 * though physically they are just strings. The mistake is caught at
 * compile time.
 */
export type Id<Brand extends string> = string & { readonly __brand: Brand };

export function makeId<Brand extends string>(value: string): Id<Brand> {
  if (value.trim() === "") {
    throw new Error("Id must not be empty");
  }
  return value as Id<Brand>;
}
