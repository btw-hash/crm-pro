import type { ClientBalance } from "@/domain/client/client-balance";
import { Money } from "@/domain/pricing/money";
import type { IndividualPrice } from "@/domain/pricing/price";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { Product } from "@/domain/product/product";
import type { ProductDescription } from "@/domain/product/product-description";
import { clientIds, productIds } from "./refs";
export const seedProducts: readonly Product[] = [
  {
    id: productIds.noirelle,
    sku: "BEL-NV-811",
    name: "Noirelle Noir Selection Chocolate",
    unit: "kg",
    packaging: "5 kg box",
    barcode: "5410291001234",
    kit: {
      category: "Chocolate & Glazes",
      benefits: [
        "Premium Belgian chocolate, stable texture",
        "Cacao-Trace — sustainable cocoa, a marketing argument",
        "Easy tempering, wide application",
      ],
      marginPercent: 32,
      shelfLife: "12 months",
      rsp: Money.dollars(10.9),
    },
  },
  {
    id: productIds.coverluxGlaze,
    sku: "CAR-COV-01",
    name: "Coverlux Cover Glaze",
    unit: "kg",
    packaging: "10 kg pail",
    barcode: "5410291005678",
    kit: {
      category: "Chocolate & Glazes",
      benefits: [
        "No tempering required — saves time",
        "Glossy finish, resistant to cracking",
        "Convenient for glazing and decoration",
      ],
      marginPercent: 38,
      shelfLife: "12 months",
      rsp: Money.dollars(5.8),
    },
  },
  {
    id: productIds.p500,
    sku: "IMP-P500",
    name: "P500 Dough Improver",
    unit: "kg",
    packaging: "25 kg bag",
    kit: {
      category: "Bread Baking",
      benefits: [
        "Stable volume and crumb structure",
        "Tolerant of flour and process variation",
        "Versatile across a wide product range",
      ],
      marginPercent: 45,
      shelfLife: "9 months",
      rsp: Money.dollars(2.3),
    },
  },
  {
    id: productIds.fruitfil,
    sku: "TOP-BRU-02",
    name: "Fruitfil Lingonberry Filling",
    unit: "kg",
    packaging: "13 kg pail",
    kit: {
      category: "Fillings",
      benefits: [
        "Thermostable — doesn't bleed out during baking",
        "High berry content, natural flavor",
        "Ready to use",
      ],
      marginPercent: 35,
      shelfLife: "10 months",
      rsp: Money.dollars(4.0),
    },
  },
  {
    id: productIds.levara,
    sku: "SAP-LIV-10",
    name: "Levara Lievito Sourdough Starter",
    unit: "kg",
    packaging: "1 kg bag",
    barcode: "5410291009012",
    kit: {
      category: "Sourdough Starters",
      benefits: [
        "Authentic sourdough taste and aroma",
        "Convenient — no need to maintain your own starter",
        "Longer freshness and shelf life for finished goods",
      ],
      marginPercent: 40,
      shelfLife: "8 months",
      rsp: Money.dollars(7.7),
    },
  },
  {
    id: productIds.laminor,
    sku: "MIM-LAM-25",
    name: "Laminor Laminating Margarine",
    unit: "kg",
    packaging: "Box of 10 × 2 kg",
    barcode: "5410291003456",
    kit: {
      category: "Fats & Margarines",
      benefits: [
        "Pliable for fine lamination",
        "Stable across working temperatures",
        "Clean taste in the finished product",
      ],
      marginPercent: 28,
      shelfLife: "12 months",
      rsp: Money.dollars(8.0),
    },
  },
  {
    id: productIds.bakewellMuffin,
    sku: "TEG-MUF-15",
    name: "Bakewell Muffin Mix",
    unit: "kg",
    packaging: "15 kg bag",
    kit: {
      category: "Mixes",
      benefits: [
        "Consistent result with minimal steps",
        "Tender texture and long-lasting freshness",
        "Saves labor on the production floor",
      ],
      marginPercent: 42,
      shelfLife: "9 months",
      rsp: Money.dollars(3.0),
    },
  },
  {
    id: productIds.glazeo,
    sku: "MIR-NEU-05",
    name: "Glazeo Neutral Glaze Gel",
    unit: "kg",
    packaging: "6 kg pail",
    kit: {
      category: "Decoration",
      benefits: [
        "Mirror shine on the finished coating",
        "Neutral flavor — doesn't change the product's profile",
        "Easy to apply",
      ],
      marginPercent: 36,
      shelfLife: "12 months",
      rsp: Money.dollars(6.0),
    },
  },
  {
    id: productIds.capsules,
    sku: "CAP-MUF-100",
    name: "Paper Muffin Cases",
    unit: "pack",
    packaging: "Box of 100",
    barcode: "4600000099001",
    kit: {
      category: "Consumables",
      benefits: ["Low-cost consumable", "High unit volume", "Low margin"],
      // Intentional: a cheap, high-volume item — a counter-example to naive ABC analysis (#177).
      marginPercent: 8,
      shelfLife: "36 months",
      rsp: Money.dollars(0.15),
    },
  },
];

// Reference AI product descriptions (a demo stand-in for batch generation #242): a
// human reviews/edits, source is the manufacturer's official website. In production
// these descriptions started empty (generated via a button); seeded here so the
// product card looks realistic.
export const seedProductDescriptions: readonly ProductDescription[] = [
  {
    productId: productIds.noirelle,
    text: "A Belgian couverture made from 100% cocoa butter, Noir Selection line. Stable flow and shine when tempered, suitable for bonbon shells, enrobing, and decoration. Cocoa sourced under the Cacao-Trace program — an argument for a sustainable positioning.",
    sourceUrl: "https://www.noirelle.com",
  },
  {
    productId: productIds.coverluxGlaze,
    text: "A confectionery glaze that needs no tempering: melts and is ready to use immediately. Gives a glossy coating resistant to cracking and bloom. Convenient for enrobing products and decoration on a production line.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.p500,
    text: "A complex bread improver: stabilizes crumb volume and structure, compensates for variation in flour quality and process. Versatile across a wide range of breads and rolls.",
    sourceUrl: null,
  },
  {
    productId: productIds.fruitfil,
    text: "A thermostable berry filling with a high lingonberry content: holds its shape during baking, doesn't bleed out. Natural flavor, ready to use — for laminated, yeasted, and shortcrust products.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.levara,
    text: "A ready-to-use sourdough starter for an authentic bread taste and aroma without maintaining your own culture. Improves the freshness and shelf life of finished goods, simplifies the process.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.laminor,
    text: "A laminating margarine: pliable for thin layers, stable across working temperatures. Gives a clean taste and pronounced lamination in croissants and puff pastry.",
    sourceUrl: null,
  },
  {
    productId: productIds.bakewellMuffin,
    text: "A dry muffin mix: consistent results with minimal steps. Tender texture, long-lasting freshness, saves labor — just add the liquid components per the recipe.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.glazeo,
    text: "A neutral mirror glaze gel for a finishing coat: adds a glossy shine without changing the product's flavor. Easy to apply, sets decoration in place and protects the surface from drying out.",
    sourceUrl: null,
  },
  {
    productId: productIds.capsules,
    text: "Paper cases for baking muffins and cupcakes. A high-volume consumable, low margin — an item for order completeness.",
    sourceUrl: null,
  },
];

export const seedPrices: readonly IndividualPrice[] = [
  { clientId: clientIds.breadWorks, productId: productIds.noirelle, price: Money.dollars(8.25) },
  { clientId: clientIds.breadWorks, productId: productIds.p500, price: Money.dollars(2.1) },
  {
    clientId: clientIds.breadWorks,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(4.55),
  },
  { clientId: clientIds.breadWorks, productId: productIds.levara, price: Money.dollars(6.8) },
  { clientId: clientIds.sweetWorld, productId: productIds.noirelle, price: Money.dollars(8.5) },
  { clientId: clientIds.sweetWorld, productId: productIds.fruitfil, price: Money.dollars(3.7) },
  {
    clientId: clientIds.sweetWorld,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(4.7),
  },
  { clientId: clientIds.sweetWorld, productId: productIds.glazeo, price: Money.dollars(5.7) },
  {
    clientId: clientIds.harborBakery,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(5.05),
  },
  { clientId: clientIds.warmBread, productId: productIds.p500, price: Money.dollars(2.3) },
  { clientId: clientIds.warmBread, productId: productIds.levara, price: Money.dollars(7.1) },
  { clientId: clientIds.tasteHolding, productId: productIds.laminor, price: Money.dollars(4.3) },
  {
    clientId: clientIds.tasteHolding,
    productId: productIds.bakewellMuffin,
    price: Money.dollars(3.05),
  },
  { clientId: clientIds.meringue, productId: productIds.fruitfil, price: Money.dollars(3.8) },
  { clientId: clientIds.meringue, productId: productIds.glazeo, price: Money.dollars(5.9) },
  {
    clientId: clientIds.groceryWholesale,
    productId: productIds.noirelle,
    price: Money.dollars(7.75),
  },
  { clientId: clientIds.groceryWholesale, productId: productIds.p500, price: Money.dollars(1.9) },
  {
    clientId: clientIds.groceryWholesale,
    productId: productIds.laminor,
    price: Money.dollars(3.95),
  },
  { clientId: clientIds.croissant, productId: productIds.laminor, price: Money.dollars(4.45) },
  { clientId: clientIds.croissant, productId: productIds.levara, price: Money.dollars(7.2) },
  {
    clientId: clientIds.coffeeMill,
    productId: productIds.bakewellMuffin,
    price: Money.dollars(3.2),
  },
  { clientId: clientIds.breadIndustries, productId: productIds.p500, price: Money.dollars(1.9) },
  {
    clientId: clientIds.breadIndustries,
    productId: productIds.noirelle,
    price: Money.dollars(7.8),
  },
  // Additional clients from the extended department.
  {
    clientId: clientIds.lakesideTrading,
    productId: productIds.noirelle,
    price: Money.dollars(7.7),
  },
  {
    clientId: clientIds.lakesideTrading,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(4.5),
  },
  { clientId: clientIds.lakesideTrading, productId: productIds.p500, price: Money.dollars(1.9) },
  { clientId: clientIds.coastalBread, productId: productIds.p500, price: Money.dollars(2.15) },
  { clientId: clientIds.riverMills, productId: productIds.p500, price: Money.dollars(2.0) },
  { clientId: clientIds.confiLux, productId: productIds.noirelle, price: Money.dollars(8.45) },
  { clientId: clientIds.confiLux, productId: productIds.glazeo, price: Money.dollars(5.8) },
  {
    clientId: clientIds.marshalConfections,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(4.7),
  },
  { clientId: clientIds.bistroKing, productId: productIds.noirelle, price: Money.dollars(8.7) },
  { clientId: clientIds.seaBreeze, productId: productIds.coverluxGlaze, price: Money.dollars(5.1) },
  { clientId: clientIds.pierCafe, productId: productIds.glazeo, price: Money.dollars(6.0) },
  { clientId: clientIds.sweetTooth, productId: productIds.fruitfil, price: Money.dollars(3.8) },
  { clientId: clientIds.amberBakery, productId: productIds.levara, price: Money.dollars(7.2) },
  { clientId: clientIds.gooseBakery, productId: productIds.p500, price: Money.dollars(2.3) },
  {
    clientId: clientIds.victoriaHypermarket,
    productId: productIds.noirelle,
    price: Money.dollars(7.7),
  },
  {
    clientId: clientIds.chocoStudio,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(5.0),
  },
  {
    clientId: clientIds.potterPastry,
    productId: productIds.coverluxGlaze,
    price: Money.dollars(5.2),
  },
];

export const seedStock: readonly StockLevel[] = [
  { productId: productIds.noirelle, freeQuantity: 200, unit: "kg" },
  { productId: productIds.coverluxGlaze, freeQuantity: 400, unit: "kg" },
  { productId: productIds.p500, freeQuantity: 1500, unit: "kg" },
  { productId: productIds.fruitfil, freeQuantity: 0, unit: "kg" },
  { productId: productIds.levara, freeQuantity: 35, unit: "kg" },
  { productId: productIds.laminor, freeQuantity: 60, unit: "kg" },
  { productId: productIds.bakewellMuffin, freeQuantity: 820, unit: "kg" },
  { productId: productIds.glazeo, freeQuantity: 12, unit: "kg" },
];

// Receivables and credit limits. Deliberately includes an over-limit client (T. Reynolds)
// and clients "at the edge" (Savor Restaurant Group, Golden Grain Industries) — to
// demonstrate receivables control.
export const seedBalances: readonly ClientBalance[] = [
  {
    clientId: clientIds.breadWorks,
    debt: Money.dollars(3_600),
    creditLimit: Money.dollars(11_100),
  },
  { clientId: clientIds.sweetWorld, debt: Money.dollars(0), creditLimit: Money.dollars(8_900) },
  { clientId: clientIds.harborBakery, debt: Money.dollars(1_100), creditLimit: Money.dollars(600) },
  { clientId: clientIds.warmBread, debt: Money.dollars(500), creditLimit: Money.dollars(1_700) },
  {
    clientId: clientIds.tasteHolding,
    debt: Money.dollars(6_800),
    creditLimit: Money.dollars(7_800),
  },
  { clientId: clientIds.meringue, debt: Money.dollars(800), creditLimit: Money.dollars(2_200) },
  {
    clientId: clientIds.groceryWholesale,
    debt: Money.dollars(13_100),
    creditLimit: Money.dollars(22_200),
  },
  {
    clientId: clientIds.croissant,
    debt: Money.dollars(1_400),
    creditLimit: Money.dollars(1_300),
  },
  {
    clientId: clientIds.breadIndustries,
    debt: Money.dollars(5_200),
    creditLimit: Money.dollars(5_600),
  },
  // Additional clients: some "at the edge" (Victoria Wholesale Market, Coastal Bakery Works)
  // and one over limit (Choco Studio).
  {
    clientId: clientIds.lakesideTrading,
    debt: Money.dollars(9_400),
    creditLimit: Money.dollars(16_700),
  },
  {
    clientId: clientIds.victoriaHypermarket,
    debt: Money.dollars(15_600),
    creditLimit: Money.dollars(16_700),
  },
  {
    clientId: clientIds.coastalBread,
    debt: Money.dollars(2_300),
    creditLimit: Money.dollars(3_300),
  },
  { clientId: clientIds.riverMills, debt: Money.dollars(2_000), creditLimit: Money.dollars(6_700) },
  { clientId: clientIds.confiLux, debt: Money.dollars(2_700), creditLimit: Money.dollars(5_600) },
  {
    clientId: clientIds.marshalConfections,
    debt: Money.dollars(0),
    creditLimit: Money.dollars(4_400),
  },
  {
    clientId: clientIds.chocoStudio,
    debt: Money.dollars(1_000),
    creditLimit: Money.dollars(900),
  },
  {
    clientId: clientIds.bistroKing,
    debt: Money.dollars(600),
    creditLimit: Money.dollars(1_700),
  },
  {
    clientId: clientIds.seaBreeze,
    debt: Money.dollars(400),
    creditLimit: Money.dollars(1_100),
  },
  {
    clientId: clientIds.sweetTooth,
    debt: Money.dollars(1_400),
    creditLimit: Money.dollars(2_800),
  },
  {
    clientId: clientIds.amberBakery,
    debt: Money.dollars(300),
    creditLimit: Money.dollars(900),
  },
  // No balance (new/small accounts): A. Bishop, The Grinder Cafe Co., L. Foster, The Pier Cafe,
  // Whitman's Bakery.
];

// Sales history (synthetic, ~12 months) — a deterministic generator over purchasing
// patterns with BUILT-IN storylines for the demo. Simulates an ERP export (the real
// one goes through ErpGateway.getSalesHistory, adapter only). No real PII.
