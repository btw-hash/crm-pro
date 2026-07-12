import type { Product } from "@/domain/product/product";

/** Option lists for dropdowns in request forms — from the ERP nomenclature (products). */
export interface NomenclatureOptions {
  /** Nomenclature item names. */
  readonly names: readonly string[];
  /** Units of measure (kg, pack, …). */
  readonly units: readonly string[];
  /** Packaging variants (5 kg box, 25 kg bag, …). */
  readonly packagings: readonly string[];
}

function uniq(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v && v.trim() !== ""))];
}

/** Splits the ERP nomenclature into option lists (names/units/packaging) for selects. */
export function nomenclatureOptions(products: readonly Product[]): NomenclatureOptions {
  return {
    names: uniq(products.map((p) => p.name)).sort((a, b) => a.localeCompare(b, "en")),
    units: uniq(products.map((p) => p.unit)),
    packagings: uniq(products.map((p) => p.packaging)),
  };
}
