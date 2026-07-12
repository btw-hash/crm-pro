import type { ProductDescriptionRepository } from "@/application/ports/product-description-repository";
import type { ProductId } from "@/domain/product/product";
import type { ProductDescription } from "@/domain/product/product-description";
import { prisma } from "./prisma-client";

function toProductDescription(row: {
  productId: string;
  text: string;
  sourceUrl: string | null;
}): ProductDescription {
  return {
    productId: row.productId as ProductId,
    text: row.text,
    sourceUrl: row.sourceUrl,
  };
}

export class PrismaProductDescriptionRepository implements ProductDescriptionRepository {
  async list(): Promise<readonly ProductDescription[]> {
    const rows = await prisma.productDescription.findMany();
    return rows.map(toProductDescription);
  }

  async get(productId: ProductId): Promise<ProductDescription | null> {
    const row = await prisma.productDescription.findUnique({ where: { productId } });
    return row ? toProductDescription(row) : null;
  }

  async save(description: ProductDescription): Promise<void> {
    await prisma.productDescription.upsert({
      where: { productId: description.productId },
      create: {
        productId: description.productId,
        text: description.text,
        sourceUrl: description.sourceUrl,
      },
      update: {
        text: description.text,
        sourceUrl: description.sourceUrl,
      },
    });
  }
}
