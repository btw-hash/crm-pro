import type { ClientBalance } from "@/domain/client/client-balance";
import { Money } from "@/domain/pricing/money";
import type { IndividualPrice } from "@/domain/pricing/price";
import type { StockLevel } from "@/domain/pricing/stock-level";
import type { Product } from "@/domain/product/product";
import type { ProductDescription } from "@/domain/product/product-description";
import { clientIds, productIds } from "./refs";
export const seedProducts: readonly Product[] = [
  {
    id: productIds.belcolade,
    sku: "BEL-NV-811",
    name: "Belcolade Noir Selection Chocolate",
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
    id: productIds.caratCover,
    sku: "CAR-COV-01",
    name: "Carat Cover Glaze",
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
    id: productIds.s500,
    sku: "IMP-S500",
    name: "S500 Dough Improver",
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
    id: productIds.topfil,
    sku: "TOP-BRU-02",
    name: "Topfil Lingonberry Filling",
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
    id: productIds.sapore,
    sku: "SAP-LIV-10",
    name: "Sapore Lievito Sourdough Starter",
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
    id: productIds.mimetic,
    sku: "MIM-LAM-25",
    name: "Mimetic Laminating Margarine",
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
    id: productIds.tegralMuffin,
    sku: "TEG-MUF-15",
    name: "Tegral Muffin Mix",
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
    id: productIds.miroir,
    sku: "MIR-NEU-05",
    name: "Miroir Neutral Glaze Gel",
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
    productId: productIds.belcolade,
    text: "A Belgian couverture made from 100% cocoa butter, Noir Selection line. Stable flow and shine when tempered, suitable for bonbon shells, enrobing, and decoration. Cocoa sourced under the Cacao-Trace program — an argument for a sustainable positioning.",
    sourceUrl: "https://www.belcolade.com",
  },
  {
    productId: productIds.caratCover,
    text: "A confectionery glaze that needs no tempering: melts and is ready to use immediately. Gives a glossy coating resistant to cracking and bloom. Convenient for enrobing products and decoration on a production line.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.s500,
    text: "A complex bread improver: stabilizes crumb volume and structure, compensates for variation in flour quality and process. Versatile across a wide range of breads and rolls.",
    sourceUrl: null,
  },
  {
    productId: productIds.topfil,
    text: "A thermostable berry filling with a high lingonberry content: holds its shape during baking, doesn't bleed out. Natural flavor, ready to use — for laminated, yeasted, and shortcrust products.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.sapore,
    text: "A ready-to-use sourdough starter for an authentic bread taste and aroma without maintaining your own culture. Improves the freshness and shelf life of finished goods, simplifies the process.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.mimetic,
    text: "A laminating margarine: pliable for thin layers, stable across working temperatures. Gives a clean taste and pronounced lamination in croissants and puff pastry.",
    sourceUrl: null,
  },
  {
    productId: productIds.tegralMuffin,
    text: "A dry muffin mix: consistent results with minimal steps. Tender texture, long-lasting freshness, saves labor — just add the liquid components per the recipe.",
    sourceUrl: "https://www.puratos.com",
  },
  {
    productId: productIds.miroir,
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
  { clientId: clientIds.hlebozavod, productId: productIds.belcolade, price: Money.dollars(8.25) },
  { clientId: clientIds.hlebozavod, productId: productIds.s500, price: Money.dollars(2.1) },
  { clientId: clientIds.hlebozavod, productId: productIds.caratCover, price: Money.dollars(4.55) },
  { clientId: clientIds.hlebozavod, productId: productIds.sapore, price: Money.dollars(6.8) },
  { clientId: clientIds.sladkiyMir, productId: productIds.belcolade, price: Money.dollars(8.5) },
  { clientId: clientIds.sladkiyMir, productId: productIds.topfil, price: Money.dollars(3.7) },
  { clientId: clientIds.sladkiyMir, productId: productIds.caratCover, price: Money.dollars(4.7) },
  { clientId: clientIds.sladkiyMir, productId: productIds.miroir, price: Money.dollars(5.7) },
  { clientId: clientIds.ipSidorov, productId: productIds.caratCover, price: Money.dollars(5.05) },
  { clientId: clientIds.teplyHleb, productId: productIds.s500, price: Money.dollars(2.3) },
  { clientId: clientIds.teplyHleb, productId: productIds.sapore, price: Money.dollars(7.1) },
  { clientId: clientIds.vkus, productId: productIds.mimetic, price: Money.dollars(4.3) },
  { clientId: clientIds.vkus, productId: productIds.tegralMuffin, price: Money.dollars(3.05) },
  { clientId: clientIds.beze, productId: productIds.topfil, price: Money.dollars(3.8) },
  { clientId: clientIds.beze, productId: productIds.miroir, price: Money.dollars(5.9) },
  { clientId: clientIds.bakaleyaOpt, productId: productIds.belcolade, price: Money.dollars(7.75) },
  { clientId: clientIds.bakaleyaOpt, productId: productIds.s500, price: Money.dollars(1.9) },
  { clientId: clientIds.bakaleyaOpt, productId: productIds.mimetic, price: Money.dollars(3.95) },
  { clientId: clientIds.croissant, productId: productIds.mimetic, price: Money.dollars(4.45) },
  { clientId: clientIds.croissant, productId: productIds.sapore, price: Money.dollars(7.2) },
  { clientId: clientIds.kofemolka, productId: productIds.tegralMuffin, price: Money.dollars(3.2) },
  { clientId: clientIds.hlebprom, productId: productIds.s500, price: Money.dollars(1.9) },
  { clientId: clientIds.hlebprom, productId: productIds.belcolade, price: Money.dollars(7.8) },
  // Additional clients from the extended department.
  {
    clientId: clientIds.tdPribaltiysky,
    productId: productIds.belcolade,
    price: Money.dollars(7.7),
  },
  {
    clientId: clientIds.tdPribaltiysky,
    productId: productIds.caratCover,
    price: Money.dollars(4.5),
  },
  { clientId: clientIds.tdPribaltiysky, productId: productIds.s500, price: Money.dollars(1.9) },
  { clientId: clientIds.baltiyskyHleb, productId: productIds.s500, price: Money.dollars(2.15) },
  { clientId: clientIds.nemanKhp, productId: productIds.s500, price: Money.dollars(2.0) },
  { clientId: clientIds.kondiLux, productId: productIds.belcolade, price: Money.dollars(8.45) },
  { clientId: clientIds.kondiLux, productId: productIds.miroir, price: Money.dollars(5.8) },
  { clientId: clientIds.kondMarshal, productId: productIds.caratCover, price: Money.dollars(4.7) },
  { clientId: clientIds.bistroKenig, productId: productIds.belcolade, price: Money.dollars(8.7) },
  { clientId: clientIds.morskoyBriz, productId: productIds.caratCover, price: Money.dollars(5.1) },
  { clientId: clientIds.kafePrichal, productId: productIds.miroir, price: Money.dollars(6.0) },
  { clientId: clientIds.sladkoezhka, productId: productIds.topfil, price: Money.dollars(3.8) },
  { clientId: clientIds.pekarnyaYantar, productId: productIds.sapore, price: Money.dollars(7.2) },
  { clientId: clientIds.pekarGuseva, productId: productIds.s500, price: Money.dollars(2.3) },
  { clientId: clientIds.giperViktoria, productId: productIds.belcolade, price: Money.dollars(7.7) },
  { clientId: clientIds.shokoStudia, productId: productIds.caratCover, price: Money.dollars(5.0) },
  { clientId: clientIds.ipGoncharova, productId: productIds.caratCover, price: Money.dollars(5.2) },
];

export const seedStock: readonly StockLevel[] = [
  { productId: productIds.belcolade, freeQuantity: 200, unit: "kg" },
  { productId: productIds.caratCover, freeQuantity: 400, unit: "kg" },
  { productId: productIds.s500, freeQuantity: 1500, unit: "kg" },
  { productId: productIds.topfil, freeQuantity: 0, unit: "kg" },
  { productId: productIds.sapore, freeQuantity: 35, unit: "kg" },
  { productId: productIds.mimetic, freeQuantity: 60, unit: "kg" },
  { productId: productIds.tegralMuffin, freeQuantity: 820, unit: "kg" },
  { productId: productIds.miroir, freeQuantity: 12, unit: "kg" },
];

// Receivables and credit limits. Deliberately includes an over-limit client (T. Reynolds)
// and clients "at the edge" (Savor Restaurant Group, Golden Grain Industries) — to
// demonstrate receivables control.
export const seedBalances: readonly ClientBalance[] = [
  {
    clientId: clientIds.hlebozavod,
    debt: Money.dollars(3_600),
    creditLimit: Money.dollars(11_100),
  },
  { clientId: clientIds.sladkiyMir, debt: Money.dollars(0), creditLimit: Money.dollars(8_900) },
  { clientId: clientIds.ipSidorov, debt: Money.dollars(1_100), creditLimit: Money.dollars(600) },
  { clientId: clientIds.teplyHleb, debt: Money.dollars(500), creditLimit: Money.dollars(1_700) },
  { clientId: clientIds.vkus, debt: Money.dollars(6_800), creditLimit: Money.dollars(7_800) },
  { clientId: clientIds.beze, debt: Money.dollars(800), creditLimit: Money.dollars(2_200) },
  {
    clientId: clientIds.bakaleyaOpt,
    debt: Money.dollars(13_100),
    creditLimit: Money.dollars(22_200),
  },
  {
    clientId: clientIds.croissant,
    debt: Money.dollars(1_400),
    creditLimit: Money.dollars(1_300),
  },
  { clientId: clientIds.hlebprom, debt: Money.dollars(5_200), creditLimit: Money.dollars(5_600) },
  // Additional clients: some "at the edge" (Victoria Wholesale Market, Coastal Bakery Works)
  // and one over limit (Choco Studio).
  {
    clientId: clientIds.tdPribaltiysky,
    debt: Money.dollars(9_400),
    creditLimit: Money.dollars(16_700),
  },
  {
    clientId: clientIds.giperViktoria,
    debt: Money.dollars(15_600),
    creditLimit: Money.dollars(16_700),
  },
  {
    clientId: clientIds.baltiyskyHleb,
    debt: Money.dollars(2_300),
    creditLimit: Money.dollars(3_300),
  },
  { clientId: clientIds.nemanKhp, debt: Money.dollars(2_000), creditLimit: Money.dollars(6_700) },
  { clientId: clientIds.kondiLux, debt: Money.dollars(2_700), creditLimit: Money.dollars(5_600) },
  { clientId: clientIds.kondMarshal, debt: Money.dollars(0), creditLimit: Money.dollars(4_400) },
  {
    clientId: clientIds.shokoStudia,
    debt: Money.dollars(1_000),
    creditLimit: Money.dollars(900),
  },
  {
    clientId: clientIds.bistroKenig,
    debt: Money.dollars(600),
    creditLimit: Money.dollars(1_700),
  },
  {
    clientId: clientIds.morskoyBriz,
    debt: Money.dollars(400),
    creditLimit: Money.dollars(1_100),
  },
  {
    clientId: clientIds.sladkoezhka,
    debt: Money.dollars(1_400),
    creditLimit: Money.dollars(2_800),
  },
  {
    clientId: clientIds.pekarnyaYantar,
    debt: Money.dollars(300),
    creditLimit: Money.dollars(900),
  },
  // No balance (new/small accounts): A. Bishop, The Grinder Cafe Co., L. Foster, The Pier Cafe,
  // Whitman's Bakery.
];

// Sales history (synthetic, ~12 months) — a deterministic generator over purchasing
// patterns with BUILT-IN storylines for the demo. Simulates an ERP export (the real
// one goes through ErpGateway.getSalesHistory, adapter only). No real PII.
