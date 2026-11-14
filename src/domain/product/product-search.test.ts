import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import type { Product } from "./product";
import { searchProducts } from "./product-search";

const p = (sku: string, name: string): Product => ({
  id: makeId<"ProductId">(sku),
  sku,
  name,
  unit: "kg",
});

const catalog: readonly Product[] = [
  p("NOI-NS-811", "Noirelle Noir Chocolate"),
  p("COV-GLZ-01", "Coverlux Cover Icing"),
  p("IMP-P500", "P500 Improver"),
  p("FRU-LNG-02", "Fruitfil Lingonberry Filling"),
];

describe("searchProducts", () => {
  it("an empty query returns everything", () => {
    expect(searchProducts(catalog, "")).toHaveLength(4);
    expect(searchProducts(catalog, "   ")).toHaveLength(4);
  });

  it("searches by part of the name, case-insensitive", () => {
    const result = searchProducts(catalog, "chocolate");
    expect(result).toHaveLength(1);
    expect(result[0]!.sku).toBe("NOI-NS-811");
  });

  it("searches by SKU", () => {
    const result = searchProducts(catalog, "p500");
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toContain("P500");
  });

  it("returns multiple matches", () => {
    expect(searchProducts(catalog, "fru")).toHaveLength(1);
    expect(searchProducts(catalog, "glz")).toHaveLength(1);
  });

  it("no match — empty array", () => {
    expect(searchProducts(catalog, "xyz123notexist")).toHaveLength(0);
  });
});
