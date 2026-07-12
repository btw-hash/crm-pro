import type { SalesOrder } from "@/domain/sales/sales-order";
import { generateSeedSalesOrders } from "../seed-sales-history";
import { generatePurchaseHistory } from "../seed-purchase-history";
import type { PurchaseReceipt } from "@/domain/purchase/purchase-receipt";
import { managers, clientIds, productIds } from "./refs";
export const seedSalesOrders: readonly SalesOrder[] = generateSeedSalesOrders([
  // Stable A-client: Pantry Wholesale Trading Co. buys Belcolade steadily (Owens).
  {
    clientId: clientIds.bakaleyaOpt,
    managerId: managers.owens,
    productId: productIds.belcolade,
    base: 4_000,
    trend: "stable",
  },
  // A departing SKU: Savor Restaurant Group tapers off Tegral to zero (last order in the past).
  {
    clientId: clientIds.vkus,
    managerId: managers.grant,
    productId: productIds.tegralMuffin,
    base: 1_000,
    trend: "declining",
  },
  // Switch: Croissant & Co Bakery drops Mimetic (through month 5) and picks up Sapore (from month 7).
  {
    clientId: clientIds.croissant,
    managerId: managers.grant,
    productId: productIds.mimetic,
    base: 1_450,
    trend: "out-by",
    pivot: 5,
  },
  {
    clientId: clientIds.croissant,
    managerId: managers.grant,
    productId: productIds.sapore,
    base: 1_200,
    trend: "in-from",
    pivot: 7,
  },
  // Growing: Sweet World Confections ramps up Carat Cover (Bennett).
  {
    clientId: clientIds.sladkiyMir,
    managerId: managers.grant,
    productId: productIds.caratCover,
    base: 900,
    trend: "growing",
  },
  // Baseline background across the remaining managers/clients/products.
  {
    clientId: clientIds.hlebozavod,
    managerId: managers.owens,
    productId: productIds.belcolade,
    base: 1_650,
    trend: "stable",
  },
  {
    clientId: clientIds.hlebprom,
    managerId: managers.mills,
    productId: productIds.s500,
    base: 600,
    trend: "stable",
  },
  {
    clientId: clientIds.teplyHleb,
    managerId: managers.mills,
    productId: productIds.sapore,
    base: 450,
    trend: "growing",
  },
  {
    clientId: clientIds.beze,
    managerId: managers.owens,
    productId: productIds.miroir,
    base: 400,
    trend: "stable",
  },
  {
    clientId: clientIds.sladkiyMir,
    managerId: managers.grant,
    productId: productIds.topfil,
    base: 450,
    trend: "stable",
  },
  // ── Additional history for the extended department (Pacific Northwest) ──
  // Owens
  {
    clientId: clientIds.bakaleyaOpt,
    managerId: managers.owens,
    productId: productIds.mimetic,
    base: 1_550,
    trend: "stable",
  },
  {
    clientId: clientIds.shokoStudia,
    managerId: managers.owens,
    productId: productIds.caratCover,
    base: 600,
    trend: "growing",
  },
  // Bennett
  {
    clientId: clientIds.giperViktoria,
    managerId: managers.grant,
    productId: productIds.belcolade,
    base: 3_350,
    trend: "stable",
  },
  // Fischer (large wholesale/industrial portfolio)
  {
    clientId: clientIds.tdPribaltiysky,
    managerId: managers.kozlov,
    productId: productIds.belcolade,
    base: 3_100,
    trend: "growing",
  },
  {
    clientId: clientIds.baltiyskyHleb,
    managerId: managers.kozlov,
    productId: productIds.s500,
    base: 1_350,
    trend: "stable",
  },
  {
    clientId: clientIds.nemanKhp,
    managerId: managers.kozlov,
    productId: productIds.s500,
    base: 1_050,
    trend: "stable",
  },
  {
    clientId: clientIds.tdPribaltiysky,
    managerId: managers.kozlov,
    productId: productIds.caratCover,
    base: 1_000,
    trend: "stable",
  },
  // Barrett (confectionery segment)
  {
    clientId: clientIds.kondiLux,
    managerId: managers.volkov,
    productId: productIds.belcolade,
    base: 1_800,
    trend: "growing",
  },
  {
    clientId: clientIds.kondMarshal,
    managerId: managers.volkov,
    productId: productIds.caratCover,
    base: 1_550,
    trend: "stable",
  },
  {
    clientId: clientIds.kondiLux,
    managerId: managers.volkov,
    productId: productIds.miroir,
    base: 550,
    trend: "stable",
  },
  // Nolan (HoReCa, smaller tickets)
  {
    clientId: clientIds.bistroKenig,
    managerId: managers.morozova,
    productId: productIds.belcolade,
    base: 500,
    trend: "growing",
  },
  {
    clientId: clientIds.morskoyBriz,
    managerId: managers.morozova,
    productId: productIds.caratCover,
    base: 350,
    trend: "stable",
  },
  {
    clientId: clientIds.kafePrichal,
    managerId: managers.morozova,
    productId: productIds.miroir,
    base: 200,
    trend: "stable",
  },
  // Sawyer (bakeries/retail)
  {
    clientId: clientIds.sladkoezhka,
    managerId: managers.novikova,
    productId: productIds.topfil,
    base: 650,
    trend: "growing",
  },
  {
    clientId: clientIds.pekarnyaYantar,
    managerId: managers.novikova,
    productId: productIds.sapore,
    base: 400,
    trend: "growing",
  },
  {
    clientId: clientIds.pekarGuseva,
    managerId: managers.novikova,
    productId: productIds.s500,
    base: 250,
    trend: "stable",
  },
  // Muffin cases: a cheap, high-volume consumable — many UNITS at little MONEY (low
  // price/margin). A counter-example to naive ABC by volume (#177).
  {
    clientId: clientIds.giperViktoria,
    managerId: managers.grant,
    productId: productIds.capsules,
    base: 400,
    trend: "stable",
    unitPriceUsd: 0.15,
  },
  {
    clientId: clientIds.sladkoezhka,
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
  { productId: productIds.belcolade, supplierName: "Puratos US", base: 4_200, unitPriceUsd: 7.8 },
  {
    productId: productIds.caratCover,
    supplierName: "Puratos US",
    base: 1_650,
    unitPriceUsd: 4.55,
    trend: "growing",
  },
  {
    productId: productIds.s500,
    supplierName: "Ingredients Wholesale Co.",
    base: 1_000,
    unitPriceUsd: 2.0,
  },
  { productId: productIds.topfil, supplierName: "Puratos US", base: 500, unitPriceUsd: 3.8 },
  {
    productId: productIds.sapore,
    supplierName: "Puratos Starter Cultures",
    base: 800,
    unitPriceUsd: 7.1,
    trend: "growing",
  },
  {
    productId: productIds.mimetic,
    supplierName: "Great Lakes Fats Co.",
    base: 450,
    unitPriceUsd: 4.2,
    trend: "declining",
  },
  {
    productId: productIds.tegralMuffin,
    supplierName: "Mix Trading Co.",
    base: 250,
    unitPriceUsd: 3.0,
    trend: "declining",
  },
  { productId: productIds.miroir, supplierName: "Decor Import Co.", base: 350, unitPriceUsd: 5.8 },
  {
    productId: productIds.capsules,
    supplierName: "Supplies Wholesale Co.",
    base: 350,
    unitPriceUsd: 0.15,
  },
]);
