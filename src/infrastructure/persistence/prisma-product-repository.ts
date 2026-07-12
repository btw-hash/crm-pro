import type { ProductRepository } from "@/application/ports/product-repository";
import type { Product, ProductId } from "@/domain/product/product";
import { Money } from "@/domain/pricing/money";
import { prisma } from "./prisma-client";

function toProduct(row: {
  id: string;
  sku: string;
  name: string;
  unit: string;
  barcode: string | null;
  shelfLife: string | null;
  packaging: string | null;
  kitCategory: string | null;
  kitBenefits: string[];
  kitMarginPercent: number | null;
  kitRspMinor: number | null;
}): Product {
  // The Sales Kit is reconstructed only if an RSP price (kitRspMinor) is set — synced
  // ERP nomenclature has no kit. kit.shelfLife reuses the shelfLife column.
  const kit =
    row.kitRspMinor != null && row.kitCategory != null
      ? {
          category: row.kitCategory,
          benefits: row.kitBenefits,
          marginPercent: row.kitMarginPercent ?? 0,
          shelfLife: row.shelfLife ?? "",
          rsp: Money.of(row.kitRspMinor),
        }
      : undefined;
  return {
    id: row.id as ProductId,
    sku: row.sku,
    name: row.name,
    unit: row.unit,
    ...(row.barcode != null ? { barcode: row.barcode } : {}),
    ...(row.shelfLife != null ? { shelfLife: row.shelfLife } : {}),
    ...(row.packaging != null ? { packaging: row.packaging } : {}),
    ...(kit ? { kit } : {}),
  };
}

export class PrismaProductRepository implements ProductRepository {
  async findById(id: ProductId): Promise<Product | null> {
    const row = await prisma.product.findUnique({ where: { id } });
    return row ? toProduct(row) : null;
  }

  async list(): Promise<readonly Product[]> {
    const rows = await prisma.product.findMany();
    return rows.map(toProduct);
  }

  async upsertMany(products: readonly Product[]): Promise<void> {
    // Per-item upsert in a transaction: discontinued items are not deleted (FK from deals/orders).
    // ERP fields + Sales Kit (CRM enrichment): kit columns are nullable, empty for ERP items.
    await prisma.$transaction(
      products.map((p) =>
        prisma.product.upsert({
          where: { id: p.id },
          create: {
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            barcode: p.barcode ?? null,
            shelfLife: p.shelfLife ?? null,
            packaging: p.packaging ?? null,
            kitCategory: p.kit?.category ?? null,
            kitBenefits: p.kit ? [...p.kit.benefits] : [],
            kitMarginPercent: p.kit?.marginPercent ?? null,
            kitRspMinor: p.kit?.rsp.amountMinor ?? null,
          },
          update: {
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            barcode: p.barcode ?? null,
            shelfLife: p.shelfLife ?? null,
            packaging: p.packaging ?? null,
            kitCategory: p.kit?.category ?? null,
            kitBenefits: p.kit ? [...p.kit.benefits] : [],
            kitMarginPercent: p.kit?.marginPercent ?? null,
            kitRspMinor: p.kit?.rsp.amountMinor ?? null,
          },
        }),
      ),
    );
  }
}
