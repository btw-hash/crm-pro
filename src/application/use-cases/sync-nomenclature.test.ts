import { describe, expect, it } from "vitest";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import { Money } from "@/domain/pricing/money";
import type { NomenclatureItem, Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { makeSyncNomenclature } from "./sync-nomenclature";

const pid = (id: string) => makeId<"ProductId">(id) as ProductId;

function fakeErp(items: readonly NomenclatureItem[]): ErpGateway {
  return { listNomenclature: async () => items } as unknown as ErpGateway;
}

describe("syncNomenclature", () => {
  it("populates the catalog from the ERP and preserves CRM enrichment (kit) by id", async () => {
    const existing: Product = {
      id: pid("p1"),
      sku: "OLD",
      name: "Old name",
      unit: "pcs",
      kit: {
        category: "Chocolate",
        benefits: ["b"],
        marginPercent: 30,
        shelfLife: "12 mo",
        rsp: Money.dollars(900),
      },
    };
    const products = new InMemoryProductRepository([existing]);
    const erp = fakeErp([
      { id: pid("p1"), sku: "NEW", name: "New name from ERP", unit: "kg" },
      { id: pid("p2"), sku: "P2", name: "New product from ERP", unit: "kg" },
    ]);

    const result = await makeSyncNomenclature({ erp, products })();

    expect(result.count).toBe(2);
    const all = await products.list();
    const p1 = all.find((p) => p.id === "p1")!;
    // The ERP overwrote the base fields…
    expect(p1.sku).toBe("NEW");
    expect(p1.name).toBe("New name from ERP");
    expect(p1.unit).toBe("kg");
    // …but the CRM kit was preserved.
    expect(p1.kit?.marginPercent).toBe(30);
    // New product added.
    expect(all.find((p) => p.id === "p2")?.name).toBe("New product from ERP");
  });

  it("empty nomenclature from the ERP — catalog is left untouched (upsert without deletion)", async () => {
    const existing: Product = { id: pid("p1"), sku: "P1", name: "Product", unit: "kg" };
    const products = new InMemoryProductRepository([existing]);
    const result = await makeSyncNomenclature({ erp: fakeErp([]), products })();
    expect(result.count).toBe(0);
    expect(await products.list()).toHaveLength(1);
  });
});
