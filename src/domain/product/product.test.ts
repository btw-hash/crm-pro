import { describe, expect, it } from "vitest";
import { Money } from "@/domain/pricing/money";
import { makeId } from "@/domain/shared/id";
import { type Product, productPitch } from "./product";

const id = makeId<"ProductId">("p1");

describe("productPitch", () => {
  it("includes benefits and shelf life, but NOT the internal margin", () => {
    const product: Product = {
      id,
      sku: "X",
      name: "Test product",
      unit: "kg",
      kit: {
        category: "Chocolate",
        benefits: ["High yield", "Easy to use"],
        marginPercent: 35,
        shelfLife: "12 months",
        rsp: Money.dollars(10),
      },
    };
    const pitch = productPitch(product);
    expect(pitch).toContain("Test product");
    expect(pitch).toContain("High yield");
    expect(pitch).toContain("12 months");
    expect(pitch).not.toContain("35");
    expect(pitch).not.toMatch(/margin/i);
  });

  it("without a kit → just the name", () => {
    expect(productPitch({ id, sku: "X", name: "Plain", unit: "kg" })).toBe("Plain");
  });
});
