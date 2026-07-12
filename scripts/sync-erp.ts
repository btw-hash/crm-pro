/**
 * Syncs the product catalog from ERP into the local CRM DB (the `products` table).
 * The catalog reads from it (not realtime). Run:
 *   PERSISTENCE_MODE=postgres ERP_MODE=odata ERP_BASE_URL=... npm run sync:erp
 * In stub mode it pulls from the seed catalog (to test the pipeline without ERP).
 */
import { makeSyncNomenclature } from "../src/application/use-cases/sync-nomenclature.js";
import { loadEnv } from "../src/infrastructure/config/env.js";
import { ConsoleLogger } from "../src/infrastructure/logging/logger.js";
import { ODataErpGateway } from "../src/infrastructure/erp/odata-erp-gateway.js";
import { StubErpGateway } from "../src/infrastructure/erp/stub-erp-gateway.js";
import { PrismaProductRepository } from "../src/infrastructure/persistence/prisma-product-repository.js";
import {
  seedBalances,
  seedPrices,
  seedProducts,
  seedPurchases,
  seedSalesOrders,
  seedStock,
} from "../src/infrastructure/persistence/seed.js";

async function main(): Promise<void> {
  const env = loadEnv();
  const erp =
    env.ERP_MODE === "odata"
      ? new ODataErpGateway(
          {
            baseUrl: env.ERP_BASE_URL ?? "",
            username: env.ERP_USERNAME ?? "",
            password: env.ERP_PASSWORD ?? "",
          },
          new ConsoleLogger(),
        )
      : new StubErpGateway(
          seedPrices,
          seedStock,
          seedBalances,
          seedSalesOrders,
          seedPurchases,
          seedProducts.map((p) => ({
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            ...(p.barcode ? { barcode: p.barcode } : {}),
          })),
        );
  const products = new PrismaProductRepository();
  const { count } = await makeSyncNomenclature({ erp, products })();
  console.log(`Synced product catalog entries from ERP: ${count}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
