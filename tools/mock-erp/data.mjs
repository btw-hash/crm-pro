// Synthetic "ERP copy" data for the demo. Keys (Ref_Key) match the ids from
// src/infrastructure/persistence/seed.ts so the CRM's own reference data lines up
// with the ERP. No real PII/trade secrets. Amounts are in USD.

// ── "Counterparties" directory (compact, for UI labels only) ──────────────────
export const counterparties = {
  "client-hlebozavod-1": { name: "Sunrise Bakery Co.", taxId: "39-0123456" },
  "client-bakaleya-opt": { name: "Pantry Wholesale Trading Co.", taxId: "39-0511223" },
  "client-sladkiy-mir": { name: "Sweet World Confections", taxId: "39-0765432" },
  "client-vkus-holding": { name: "Savor Restaurant Group", taxId: "39-0998877" },
  "client-croissant": { name: "Croissant & Co Bakery", taxId: "" },
  "client-teply-hleb": { name: "Warm Hearth Bakery", taxId: "" },
  "client-hlebprom": { name: "Golden Grain Industries", taxId: "39-0944556" },
  "client-beze": { name: "Meringue Confectionery", taxId: "" },
  "client-td-pribaltiysky": { name: "Coastal Trading Co.", taxId: "39-0577889" },
  "client-giper-viktoria": { name: "Victoria Wholesale Market", taxId: "39-0644551" },
  "client-neman-khp": { name: "Hood River Grain Co.", taxId: "39-2033445" },
  "client-baltiysky-hleb": { name: "Coastal Bakery Works", taxId: "39-1200112" },
  "client-kondi-lux": { name: "Lux Confectionery", taxId: "39-0455667" },
  "client-kond-marshal": { name: "Maison Marchand Confectionery", taxId: "39-0466778" },
  "client-sladkoezhka": { name: "Sweet Tooth Market", taxId: "39-0822334" },
  "client-pekarnya-yantar": { name: "Amber Bakery", taxId: "" },
  "client-shoko-studia": { name: "Choco Studio", taxId: "" },
  "client-bistro-kenig": { name: "Rose City Bistro", taxId: "" },
  "client-morskoy-briz": { name: "Sea Breeze Cafe", taxId: "" },
  "client-kafe-prichal": { name: "The Pier Cafe", taxId: "" },
  "client-ip-goncharova": { name: "L. Foster", taxId: "" },
  "client-pekar-guseva": { name: "Whitman's Bakery", taxId: "" },
  "client-ip-sidorov": { name: "T. Reynolds", taxId: "" },
};

// ── "Products" directory (compact, for UI labels only) ────────────────────────
export const products = {
  "product-belcolade-nv": { name: "Belcolade Noir Selection Chocolate", unit: "kg" },
  "product-carat-cover": { name: "Carat Cover Glaze", unit: "kg" },
  "product-uluchshitel-s500": { name: "S500 Dough Improver", unit: "kg" },
  "product-topfil-brusnika": { name: "Topfil Lingonberry Filling", unit: "kg" },
  "product-sapore-zakvaska": { name: "Sapore Lievito Sourdough Starter", unit: "kg" },
  "product-mimetic-margarin": { name: "Mimetic Laminating Margarine", unit: "kg" },
  "product-tegral-muffin": { name: "Tegral Muffin Mix", unit: "kg" },
  "product-miroir-gel": { name: "Miroir Neutral Glaze Gel", unit: "kg" },
  "product-capsules-muffin": { name: "Paper Muffin Cases", unit: "pack" },
};

// ── "Client prices" register (price lists/contracts in the ERP) ───────────────
// Mirrors seedPrices. Prices are in USD.
export const prices = [
  { clientKey: "client-hlebozavod-1", productKey: "product-belcolade-nv", price: 8.25 },
  { clientKey: "client-hlebozavod-1", productKey: "product-uluchshitel-s500", price: 2.1 },
  { clientKey: "client-hlebozavod-1", productKey: "product-carat-cover", price: 4.55 },
  { clientKey: "client-hlebozavod-1", productKey: "product-sapore-zakvaska", price: 6.8 },
  { clientKey: "client-sladkiy-mir", productKey: "product-belcolade-nv", price: 8.5 },
  { clientKey: "client-sladkiy-mir", productKey: "product-topfil-brusnika", price: 3.7 },
  { clientKey: "client-sladkiy-mir", productKey: "product-carat-cover", price: 4.7 },
  { clientKey: "client-sladkiy-mir", productKey: "product-miroir-gel", price: 5.7 },
  { clientKey: "client-ip-sidorov", productKey: "product-carat-cover", price: 5.05 },
  { clientKey: "client-teply-hleb", productKey: "product-uluchshitel-s500", price: 2.3 },
  { clientKey: "client-teply-hleb", productKey: "product-sapore-zakvaska", price: 7.1 },
  { clientKey: "client-vkus-holding", productKey: "product-mimetic-margarin", price: 4.3 },
  { clientKey: "client-vkus-holding", productKey: "product-tegral-muffin", price: 3.05 },
  { clientKey: "client-beze", productKey: "product-topfil-brusnika", price: 3.8 },
  { clientKey: "client-beze", productKey: "product-miroir-gel", price: 5.9 },
  { clientKey: "client-bakaleya-opt", productKey: "product-belcolade-nv", price: 7.75 },
  { clientKey: "client-bakaleya-opt", productKey: "product-uluchshitel-s500", price: 1.9 },
  { clientKey: "client-bakaleya-opt", productKey: "product-mimetic-margarin", price: 3.95 },
  { clientKey: "client-croissant", productKey: "product-mimetic-margarin", price: 4.45 },
  { clientKey: "client-croissant", productKey: "product-sapore-zakvaska", price: 7.2 },
  { clientKey: "client-kofemolka", productKey: "product-tegral-muffin", price: 3.2 },
  { clientKey: "client-hlebprom", productKey: "product-uluchshitel-s500", price: 1.9 },
  { clientKey: "client-hlebprom", productKey: "product-belcolade-nv", price: 7.8 },
  { clientKey: "client-td-pribaltiysky", productKey: "product-belcolade-nv", price: 7.7 },
  { clientKey: "client-td-pribaltiysky", productKey: "product-carat-cover", price: 4.5 },
  { clientKey: "client-td-pribaltiysky", productKey: "product-uluchshitel-s500", price: 1.9 },
  { clientKey: "client-baltiysky-hleb", productKey: "product-uluchshitel-s500", price: 2.15 },
  { clientKey: "client-neman-khp", productKey: "product-uluchshitel-s500", price: 2.0 },
  { clientKey: "client-kondi-lux", productKey: "product-belcolade-nv", price: 8.45 },
  { clientKey: "client-kondi-lux", productKey: "product-miroir-gel", price: 5.8 },
  { clientKey: "client-kond-marshal", productKey: "product-carat-cover", price: 4.7 },
  { clientKey: "client-bistro-kenig", productKey: "product-belcolade-nv", price: 8.7 },
  { clientKey: "client-morskoy-briz", productKey: "product-carat-cover", price: 5.1 },
  { clientKey: "client-kafe-prichal", productKey: "product-miroir-gel", price: 6.0 },
  { clientKey: "client-sladkoezhka", productKey: "product-topfil-brusnika", price: 3.8 },
  { clientKey: "client-pekarnya-yantar", productKey: "product-sapore-zakvaska", price: 7.2 },
  { clientKey: "client-pekar-guseva", productKey: "product-uluchshitel-s500", price: 2.3 },
  { clientKey: "client-giper-viktoria", productKey: "product-belcolade-nv", price: 7.7 },
  { clientKey: "client-shoko-studia", productKey: "product-carat-cover", price: 5.0 },
  { clientKey: "client-ip-goncharova", productKey: "product-carat-cover", price: 5.2 },
];

// ── "Product balances" register (warehouse). onHand — on the shelf; the server
// computes free stock: onHand minus live reservations (Document_StockReservation).
// Mirrors seedStock. ──
export const stock = [
  { productKey: "product-belcolade-nv", onHand: 200, unit: "kg" },
  { productKey: "product-carat-cover", onHand: 400, unit: "kg" },
  { productKey: "product-uluchshitel-s500", onHand: 1500, unit: "kg" },
  { productKey: "product-topfil-brusnika", onHand: 0, unit: "kg" },
  { productKey: "product-sapore-zakvaska", onHand: 35, unit: "kg" },
  { productKey: "product-mimetic-margarin", onHand: 60, unit: "kg" },
  { productKey: "product-tegral-muffin", onHand: 820, unit: "kg" },
  { productKey: "product-miroir-gel", onHand: 12, unit: "kg" },
];

// ── "Settlements" register (receivables + credit limit). Mirrors seedBalances. USD. ──
export const receivables = [
  { clientKey: "client-hlebozavod-1", debt: 3600, creditLimit: 11100 },
  { clientKey: "client-sladkiy-mir", debt: 0, creditLimit: 8900 },
  { clientKey: "client-ip-sidorov", debt: 1100, creditLimit: 600 },
  { clientKey: "client-teply-hleb", debt: 500, creditLimit: 1700 },
  { clientKey: "client-vkus-holding", debt: 6800, creditLimit: 7800 },
  { clientKey: "client-beze", debt: 800, creditLimit: 2200 },
  { clientKey: "client-bakaleya-opt", debt: 13100, creditLimit: 22200 },
  { clientKey: "client-croissant", debt: 1400, creditLimit: 1300 },
  { clientKey: "client-hlebprom", debt: 5200, creditLimit: 5600 },
  { clientKey: "client-td-pribaltiysky", debt: 9400, creditLimit: 16700 },
  { clientKey: "client-giper-viktoria", debt: 15600, creditLimit: 16700 },
  { clientKey: "client-baltiysky-hleb", debt: 2300, creditLimit: 3300 },
  { clientKey: "client-neman-khp", debt: 2000, creditLimit: 6700 },
  { clientKey: "client-kondi-lux", debt: 2700, creditLimit: 5600 },
  { clientKey: "client-kond-marshal", debt: 0, creditLimit: 4400 },
  { clientKey: "client-shoko-studia", debt: 1000, creditLimit: 900 },
  { clientKey: "client-bistro-kenig", debt: 600, creditLimit: 1700 },
  { clientKey: "client-morskoy-briz", debt: 400, creditLimit: 1100 },
  { clientKey: "client-sladkoezhka", debt: 1400, creditLimit: 2800 },
  { clientKey: "client-pekarnya-yantar", debt: 300, creditLimit: 900 },
];

// ── Deterministic history (no Date.now / Math.random -> the demo is stable across
// runs). Period: 12 months, 2025-07 .. 2026-06 (same as the src generator
// `seed-sales-history.ts`), so the "Year"/"Half-year" breakdowns show a LIVE curve
// instead of flat equal bars. Each pattern "breathes" along its own trend — see
// amountForMonth().
//
// Storylines built into the trends (the same ones the assortment/recommendations/
// procurement analytics read — they enrich all the AI analytics):
//   • a large stable A-client (Pantry Wholesale Trading Co., Victoria Wholesale
//     Market)                                                    -> stable
//   • growing clients (Sunrise Bakery Co., Coastal Trading Co., Savor Restaurant
//     Group)                                                     -> growing
//   • a client fading to zero (Golden Grain Industries, dough improver) -> declining
//   • a SKU that was dropped — purchases stopped mid-period
//       (Sweet Tooth Market x Topfil Lingonberry Filling)         -> out-by (pivot 5)
//   • a new SKU that appeared — started in the second half of the period
//       (Meringue Confectionery x Miroir Glaze Gel)                -> in-from (pivot 6)
const SALES_PATTERNS = [
  // A large stable A-client — the revenue backbone, a flat line.
  {
    clientKey: "client-bakaleya-opt",
    manager: "manager-owens",
    productKey: "product-belcolade-nv",
    base: 4000,
    trend: "stable",
  },
  // A growing client — the curve trends up toward the end of the period.
  {
    clientKey: "client-hlebozavod-1",
    manager: "manager-owens",
    productKey: "product-belcolade-nv",
    base: 1700,
    trend: "growing",
  },
  {
    clientKey: "client-sladkiy-mir",
    manager: "manager-grant",
    productKey: "product-carat-cover",
    base: 900,
    trend: "stable",
  },
  // Growing — a new SKU (muffin mix) is picking up momentum.
  {
    clientKey: "client-vkus-holding",
    manager: "manager-grant",
    productKey: "product-tegral-muffin",
    base: 1000,
    trend: "growing",
  },
  // A large stable client — the second pillar of revenue.
  {
    clientKey: "client-giper-viktoria",
    manager: "manager-grant",
    productKey: "product-belcolade-nv",
    base: 3300,
    trend: "stable",
  },
  // A fading client — a linear decline to zero (losing the dough improver line).
  {
    clientKey: "client-hlebprom",
    manager: "manager-mills",
    productKey: "product-uluchshitel-s500",
    base: 600,
    trend: "declining",
  },
  {
    clientKey: "client-teply-hleb",
    manager: "manager-mills",
    productKey: "product-sapore-zakvaska",
    base: 450,
    trend: "stable",
  },
  // A growing large client — noticeable upward momentum.
  {
    clientKey: "client-td-pribaltiysky",
    manager: "manager-kozlov",
    productKey: "product-belcolade-nv",
    base: 3100,
    trend: "growing",
  },
  {
    clientKey: "client-kondi-lux",
    manager: "manager-volkov",
    productKey: "product-belcolade-nv",
    base: 1800,
    trend: "stable",
  },
  // A dropped SKU: purchases of Topfil Lingonberry Filling stopped after month 6 (index 5).
  {
    clientKey: "client-sladkoezhka",
    manager: "manager-novikova",
    productKey: "product-topfil-brusnika",
    base: 700,
    trend: "out-by",
    pivot: 5,
  },
  // A newly appeared SKU: Miroir Glaze Gel started in the second half of the period (from index 6).
  {
    clientKey: "client-beze",
    manager: "manager-volkov",
    productKey: "product-miroir-gel",
    base: 800,
    trend: "in-from",
    pivot: 6,
  },
];

const PURCHASE_PATTERNS = [
  // The flagship — steadily restocked for the large stable clients.
  {
    supplier: "Puratos North America",
    productKey: "product-belcolade-nv",
    base: 4200,
    unitCost: 8,
    trend: "stable",
  },
  {
    supplier: "Puratos North America",
    productKey: "product-carat-cover",
    base: 1700,
    unitCost: 4.5,
    trend: "stable",
  },
  // Buying less and less dough improver — mirrors the declining client above.
  {
    supplier: "Ingredient Wholesale Co.",
    productKey: "product-uluchshitel-s500",
    base: 1000,
    unitCost: 2,
    trend: "declining",
  },
  {
    supplier: "Puratos Sourdough Cultures",
    productKey: "product-sapore-zakvaska",
    base: 800,
    unitCost: 7,
    trend: "stable",
  },
  // Buying more margarine over time — for the growing demand for muffins/laminated dough.
  {
    supplier: "Pacific Fats Co.",
    productKey: "product-mimetic-margarin",
    base: 450,
    unitCost: 4.2,
    trend: "growing",
  },
];

const MONTHS_COUNT = 12; // 2025-07 .. 2026-06

// A month label "YYYY-MM-15T00:00:00" for index 0..11, starting from July 2025.
function monthLabel(index) {
  let month = 7 + index;
  const year = 2025 + Math.floor((month - 1) / 12);
  month = ((month - 1) % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}-15T00:00:00`;
}

function roundAmount(amount) {
  return Math.round(amount / 10) * 10;
}

// The order amount for a given month (0 -- no order that month). Deterministic by
// trend and month index, no Date.now/Math.random. Logic ported from
// src/infrastructure/persistence/seed-sales-history.ts (`amountForMonth`): stable/
// growing/declining/out-by/in-from + a light +-4% "breathing".
function amountForMonth(p, i, n) {
  const breathing = 1 + ((i % 3) - 1) * 0.04; // +-4%, no randomness
  switch (p.trend) {
    case "growing":
      return roundAmount(p.base * (1 + i * 0.05) * breathing);
    case "declining": {
      // a linear decline to zero by the end of the period -- the last order is in the past
      const k = Math.max(0, 1 - i * 0.16);
      return k < 0.15 ? 0 : roundAmount(p.base * k);
    }
    case "out-by":
      return i <= (p.pivot ?? n) ? roundAmount(p.base * breathing) : 0;
    case "in-from":
      return i >= (p.pivot ?? 0) ? roundAmount(p.base * breathing) : 0;
    case "stable":
    default:
      return roundAmount(p.base * breathing);
  }
}

// Average unit price per product, USD (to derive a quantity from an amount).
// Duplicated compactly (no import from src) so the history's quantities stay
// plausible and stable; for a per-item product (paper cases) the low price means
// many units for a small amount of money.
function unitPrice(key) {
  switch (key) {
    case "product-belcolade-nv":
      return 8;
    case "product-carat-cover":
      return 4.7;
    case "product-uluchshitel-s500":
      return 2;
    case "product-topfil-brusnika":
      return 3.8;
    case "product-sapore-zakvaska":
      return 7;
    case "product-mimetic-margarin":
      return 4.2;
    case "product-tegral-muffin":
      return 3.1;
    case "product-miroir-gel":
      return 5.8;
    case "product-capsules-muffin":
      return 0.15;
    default:
      return 7.5;
  }
}

/** Document_GoodsAndServicesSales[] -- month by month per pattern, with trends. */
export function salesHistory() {
  const docs = [];
  let n = 0;
  for (let month = 0; month < MONTHS_COUNT; month++) {
    for (const p of SALES_PATTERNS) {
      const amount = amountForMonth(p, month, MONTHS_COUNT);
      if (amount <= 0) continue; // no order this month (dropped / not started yet / faded out) -- no document
      n += 1;
      const unit = products[p.productKey]?.unit ?? "kg";
      const quantity = Math.max(1, Math.round(amount / unitPrice(p.productKey)));
      docs.push({
        Ref_Key: `si-${String(n).padStart(4, "0")}`,
        Number: `SI-${String(n).padStart(4, "0")}`,
        Date: monthLabel(month),
        Client_Key: p.clientKey,
        Manager: p.manager,
        DocumentTotal: amount,
        Lines: [
          {
            Product_Key: p.productKey,
            Quantity: quantity,
            Amount: amount,
            Unit: unit,
          },
        ],
      });
    }
  }
  return docs;
}

/** Document_GoodsAndServicesReceipt[] -- month by month per purchase pattern, with trends. */
export function purchaseHistory() {
  const docs = [];
  let n = 0;
  for (let month = 0; month < MONTHS_COUNT; month++) {
    for (const p of PURCHASE_PATTERNS) {
      const amount = amountForMonth(p, month, MONTHS_COUNT);
      if (amount <= 0) continue;
      n += 1;
      const unit = products[p.productKey]?.unit ?? "kg";
      docs.push({
        Ref_Key: `gr-${String(n).padStart(4, "0")}`,
        Number: `GR-${String(n).padStart(4, "0")}`,
        Date: monthLabel(month),
        Supplier: p.supplier,
        DocumentTotal: amount,
        Lines: [
          {
            Product_Key: p.productKey,
            Quantity: Math.max(1, Math.round(amount / p.unitCost)),
            Amount: amount,
            Unit: unit,
          },
        ],
      });
    }
  }
  return docs;
}
