import type { SalesOrder } from "@/domain/sales/sales-order";
import { generateSeedSalesOrders } from "../seed-sales-history";
import { generatePurchaseHistory } from "../seed-purchase-history";
import type { PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import { managers, clientIds, productIds } from "./refs";
export const seedSalesOrders: readonly SalesOrder[] = generateSeedSalesOrders([
  // Stable A-client: Pantry Wholesale Trading Co. buys Noirelle steadily (Owens).
  {
    clientId: clientIds.groceryWholesale,
    managerId: managers.owens,
    productId: productIds.noirelle,
    base: 4_000,
    trend: "stable",
  },
  // A departing SKU: Savor Restaurant Group tapers off Bakewell to zero (last order in the past).
  {
    clientId: clientIds.tasteHolding,
    managerId: managers.grant,
    productId: productIds.bakewellMuffin,
    base: 1_000,
    trend: "declining",
  },
  // Switch: Croissant & Co Bakery drops Laminor (through month 5) and picks up Levara (from month 7).
  {
    clientId: clientIds.croissant,
    managerId: managers.grant,
    productId: productIds.laminor,
    base: 1_450,
    trend: "out-by",
    pivot: 5,
  },
  {
    clientId: clientIds.croissant,
    managerId: managers.grant,
    productId: productIds.levara,
    base: 1_200,
    trend: "in-from",
    pivot: 7,
  },
  // Growing: Sweet World Confections ramps up Coverlux Cover (Bennett).
  {
    clientId: clientIds.sweetWorld,
    managerId: managers.grant,
    productId: productIds.coverluxGlaze,
    base: 900,
    trend: "growing",
  },
  // Baseline background across the remaining managers/clients/products.
  {
    clientId: clientIds.breadWorks,
    managerId: managers.owens,
    productId: productIds.noirelle,
    base: 1_650,
    trend: "stable",
  },
  {
    clientId: clientIds.breadIndustries,
    managerId: managers.mills,
    productId: productIds.p500,
    base: 600,
    trend: "stable",
  },
  {
    clientId: clientIds.warmBread,
    managerId: managers.mills,
    productId: productIds.levara,
    base: 450,
    trend: "growing",
  },
  {
    clientId: clientIds.meringue,
    managerId: managers.owens,
    productId: productIds.glazeo,
    base: 400,
    trend: "stable",
  },
  {
    clientId: clientIds.sweetWorld,
    managerId: managers.grant,
    productId: productIds.fruitfil,
    base: 450,
    trend: "stable",
  },
  // ── Additional history for the extended department (Pacific Northwest) ──
  // Owens
  {
    clientId: clientIds.groceryWholesale,
    managerId: managers.owens,
    productId: productIds.laminor,
    base: 1_550,
    trend: "stable",
  },
  {
    clientId: clientIds.chocoStudio,
    managerId: managers.owens,
    productId: productIds.coverluxGlaze,
    base: 600,
    trend: "growing",
  },
  // Bennett
  {
    clientId: clientIds.victoriaHypermarket,
    managerId: managers.grant,
    productId: productIds.noirelle,
    base: 3_350,
    trend: "stable",
  },
  // Fischer (large wholesale/industrial portfolio)
  {
    clientId: clientIds.lakesideTrading,
    managerId: managers.kozlov,
    productId: productIds.noirelle,
    base: 3_100,
    trend: "growing",
  },
  {
    clientId: clientIds.coastalBread,
    managerId: managers.kozlov,
    productId: productIds.p500,
    base: 1_350,
    trend: "stable",
  },
  {
    clientId: clientIds.riverMills,
    managerId: managers.kozlov,
    productId: productIds.p500,
    base: 1_050,
    trend: "stable",
  },
  {
    clientId: clientIds.lakesideTrading,
    managerId: managers.kozlov,
    productId: productIds.coverluxGlaze,
    base: 1_000,
    trend: "stable",
  },
  // Barrett (confectionery segment)
  {
    clientId: clientIds.confiLux,
    managerId: managers.volkov,
    productId: productIds.noirelle,
    base: 1_800,
    trend: "growing",
  },
  {
    clientId: clientIds.marshalConfections,
    managerId: managers.volkov,
    productId: productIds.coverluxGlaze,
    base: 1_550,
    trend: "stable",
  },
  {
    clientId: clientIds.confiLux,
    managerId: managers.volkov,
    productId: productIds.glazeo,
    base: 550,
    trend: "stable",
  },
  // Nolan (HoReCa, smaller tickets)
  {
    clientId: clientIds.bistroKing,
    managerId: managers.morozova,
    productId: productIds.noirelle,
    base: 500,
    trend: "growing",
  },
  {
    clientId: clientIds.seaBreeze,
    managerId: managers.morozova,
    productId: productIds.coverluxGlaze,
    base: 350,
    trend: "stable",
  },
  {
    clientId: clientIds.pierCafe,
    managerId: managers.morozova,
    productId: productIds.glazeo,
    base: 200,
    trend: "stable",
  },
  // Sawyer (bakeries/retail)
  {
    clientId: clientIds.sweetTooth,
    managerId: managers.novikova,
    productId: productIds.fruitfil,
    base: 650,
    trend: "growing",
  },
  {
    clientId: clientIds.amberBakery,
    managerId: managers.novikova,
    productId: productIds.levara,
    base: 400,
    trend: "growing",
  },
  {
    clientId: clientIds.gooseBakery,
    managerId: managers.novikova,
    productId: productIds.p500,
    base: 250,
    trend: "stable",
  },
  // Muffin cases: a cheap, high-volume consumable — many UNITS at little MONEY (low
  // price/margin). A counter-example to naive ABC by volume (#177).
  {
    clientId: clientIds.victoriaHypermarket,
    managerId: managers.grant,
    productId: productIds.capsules,
    base: 400,
    trend: "stable",
    unitPriceUsd: 0.15,
  },
  {
    clientId: clientIds.sweetTooth,
    managerId: managers.novikova,
    productId: productIds.capsules,
    base: 200,
    trend: "growing",
    unitPriceUsd: 0.15,
  },
]);

// Purchase history (receipts from suppliers) — for purchasing analysis #178 (purchased ↔
// consumed). Cross-referenced with stock and sales → shortfall/overstock.
export const seedPurchases: readonly PurchaseReceipt[] = generatePurchaseHistory([
  { productId: productIds.noirelle, supplierName: "Puratos US", base: 4_200, unitPriceUsd: 7.8 },
  {
    productId: productIds.coverluxGlaze,
    supplierName: "Puratos US",
    base: 1_650,
    unitPriceUsd: 4.55,
    trend: "growing",
  },
  {
    productId: productIds.p500,
    supplierName: "Ingredients Wholesale Co.",
    base: 1_000,
    unitPriceUsd: 2.0,
  },
  { productId: productIds.fruitfil, supplierName: "Puratos US", base: 500, unitPriceUsd: 3.8 },
  {
    productId: productIds.levara,
    supplierName: "Puratos Starter Cultures",
    base: 800,
    unitPriceUsd: 7.1,
    trend: "growing",
  },
  {
    productId: productIds.laminor,
    supplierName: "Great Lakes Fats Co.",
    base: 450,
    unitPriceUsd: 4.2,
    trend: "declining",
  },
  {
    productId: productIds.bakewellMuffin,
    supplierName: "Mix Trading Co.",
    base: 250,
    unitPriceUsd: 3.0,
    trend: "declining",
  },
  { productId: productIds.glazeo, supplierName: "Decor Import Co.", base: 350, unitPriceUsd: 5.8 },
  {
    productId: productIds.capsules,
    supplierName: "Supplies Wholesale Co.",
    base: 350,
    unitPriceUsd: 0.15,
  },
]);
