/**
 * Filters the product list by a text query.
 * Searches by name and SKU. Pure function — no side effects.
 * Client-side filtering over the full list (≤1000 items — acceptable).
 * Generic over {name, sku} — works with both the domain Product and a plain DTO
 * (the catalog card is passed to the client component serialized, without classes).
 */
export function searchProducts<T extends { readonly name: string; readonly sku: string }>(
  products: readonly T[],
  query: string,
): readonly T[] {
  const q = query.trim().toLowerCase();
  if (!q) return products;
  return products.filter(
    (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
  );
}
