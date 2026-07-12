import type { AiGateway } from "@/application/ports/ai-gateway";
import type { ProductDescriptionRepository } from "@/application/ports/product-description-repository";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ProductDescription } from "@/domain/product/product-description";

export type ListProductDescriptions = () => Promise<readonly ProductDescription[]>;

export function makeListProductDescriptions(deps: {
  descriptions: ProductDescriptionRepository;
}): ListProductDescriptions {
  return () => deps.descriptions.list();
}

export type GenerateProductDescriptions = () => Promise<{ generated: number; total: number }>;

/**
 * Batch generation of AI product descriptions (#213): for products WITHOUT a description,
 * calls `describeProduct` and saves it to storage. Ahead of time, not realtime — doesn't touch
 * already-generated ones. Descriptions use non-sensitive data (name/category/benefits) → the
 * global AI circuit is allowed; marked "AI-generated".
 */
export function makeGenerateProductDescriptions(deps: {
  products: ProductRepository;
  descriptions: ProductDescriptionRepository;
  ai: AiGateway;
}): GenerateProductDescriptions {
  return async () => {
    const products = await deps.products.list();
    let generated = 0;
    for (const product of products) {
      if (!product.kit) continue;
      if (await deps.descriptions.get(product.id)) continue; // already generated — skip
      const { text, sourceUrl } = await deps.ai.describeProduct({
        name: product.name,
        category: product.kit.category,
        benefits: product.kit.benefits,
      });
      await deps.descriptions.save({ productId: product.id, text, sourceUrl });
      generated += 1;
    }
    return { generated, total: products.length };
  };
}
