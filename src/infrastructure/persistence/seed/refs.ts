import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";

// Demo data (synthetic, no real PII/trade secrets). Simulates an ERP export so
// features can be shown before real database access. When the ERP integration
// is connected, the source changes in the composition root; screens/logic are
// untouched.

export const managers = {
  owens: "manager-owens",
  grant: "manager-grant",
  mills: "manager-mills",
  kozlov: "manager-kozlov",
  morozova: "manager-morozova",
  volkov: "manager-volkov",
  novikova: "manager-novikova",
} as const;

/** Human-readable sales manager names for UI (demo; in production — from the ERP directory). */
export const MANAGER_LABELS: Record<string, string> = {
  [managers.owens]: "Daniel Owens",
  [managers.grant]: "Bennett",
  [managers.mills]: "Coleman",
  [managers.kozlov]: "Fischer",
  [managers.morozova]: "Nolan",
  [managers.volkov]: "Barrett",
  [managers.novikova]: "Sawyer",
};

export function managerLabel(id: string): string {
  return MANAGER_LABELS[id] ?? id;
}

/** Head of sales (sees the whole department). In production — from the ERP/auth directory. */
export const heads = {
  alexander: "head-alexander",
} as const;

/** Head of sales names for UI (demo). */
export const HEAD_LABELS: Record<string, string> = {
  [heads.alexander]: "Alan Peterson",
};

/** Category buyer/procurement lead (supply: quotas, deficit allocation). In production — from ERP/auth. */
export const buyers = {
  demo: "buyer-demo",
} as const;

/** Buyer names for UI (demo). */
export const BUYER_LABELS: Record<string, string> = {
  [buyers.demo]: "Sam Griffin",
};

/** Accountant (ops loop: in_accounting stage). In production — from ERP/auth. */
export const accountants = {
  demo: "accountant-demo",
} as const;

/** Accountant names for UI (demo). */
export const ACCOUNTANT_LABELS: Record<string, string> = {
  [accountants.demo]: "Olivia Mills",
};

/** Logistics (ops loop: loading stage). In production — from ERP/auth. */
export const logists = {
  demo: "logist-demo",
} as const;

/** Logistics names for UI (demo). */
export const LOGIST_LABELS: Record<string, string> = {
  [logists.demo]: "Peter Grant",
};

export const technologists = {
  kent: "tech-kent",
  derek: "tech-derek",
} as const;

/** Human-readable technologist names for UI (demo; in production — from the ERP directory). */
export const TECHNOLOGIST_LABELS: Record<string, string> = {
  [technologists.kent]: "Maria Kent",
  [technologists.derek]: "Technologist Nathan Cole",
};

/**
 * List of technologists for round-robin routing of test requests (#6). Order
 * is fixed → distribution is deterministic. In production — from the
 * ERP/auth directory.
 */
export const seedTechnologistIds: readonly string[] = [technologists.kent, technologists.derek];

/** User name (head of sales/manager/technologist/accountant/logistics) for UI; falls back to the id itself if unknown. */
export function personLabel(id: string): string {
  return (
    MANAGER_LABELS[id] ??
    TECHNOLOGIST_LABELS[id] ??
    HEAD_LABELS[id] ??
    BUYER_LABELS[id] ??
    ACCOUNTANT_LABELS[id] ??
    LOGIST_LABELS[id] ??
    id
  );
}

export const clientIds = {
  breadWorks: makeId<"ClientId">("client-bread-works-1"),
  sweetWorld: makeId<"ClientId">("client-sweet-world"),
  harborBakery: makeId<"ClientId">("client-harbor-bakery"),
  warmBread: makeId<"ClientId">("client-warm-bread"),
  tasteHolding: makeId<"ClientId">("client-taste-holding"),
  meringue: makeId<"ClientId">("client-meringue"),
  groceryWholesale: makeId<"ClientId">("client-grocery-wholesale"),
  croissant: makeId<"ClientId">("client-croissant"),
  coffeeMill: makeId<"ClientId">("client-coffee-mill"),
  smithConfections: makeId<"ClientId">("client-smith-confections"),
  breadIndustries: makeId<"ClientId">("client-bread-industries"),
  // Additional clients for the Pacific Northwest region (demo department of 7 sales managers).
  coastalBread: makeId<"ClientId">("client-coastal-bread"),
  seaBreeze: makeId<"ClientId">("client-sea-breeze"),
  confiLux: makeId<"ClientId">("client-confi-lux"),
  amberBakery: makeId<"ClientId">("client-amber-bakery"),
  lakesideTrading: makeId<"ClientId">("client-lakeside-trading"),
  pierCafe: makeId<"ClientId">("client-pier-cafe"),
  potterPastry: makeId<"ClientId">("client-potter-pastry"),
  sweetTooth: makeId<"ClientId">("client-sweet-tooth"),
  riverMills: makeId<"ClientId">("client-river-mills"),
  bistroKing: makeId<"ClientId">("client-bistro-king"),
  marshalConfections: makeId<"ClientId">("client-marshal-confections"),
  gooseBakery: makeId<"ClientId">("client-goose-bakery"),
  victoriaHypermarket: makeId<"ClientId">("client-victoria-hypermarket"),
  chocoStudio: makeId<"ClientId">("client-choco-studio"),
} satisfies Record<string, ClientId>;

export const productIds = {
  noirelle: makeId<"ProductId">("product-noirelle-nv"),
  coverluxGlaze: makeId<"ProductId">("product-coverlux-cover"),
  p500: makeId<"ProductId">("product-uluchshitel-p500"),
  fruitfil: makeId<"ProductId">("product-fruitfil-brusnika"),
  levara: makeId<"ProductId">("product-levara-zakvaska"),
  laminor: makeId<"ProductId">("product-laminor-margarin"),
  bakewellMuffin: makeId<"ProductId">("product-bakewell-muffin"),
  glazeo: makeId<"ProductId">("product-glazeo-gel"),
  capsules: makeId<"ProductId">("product-capsules-muffin"),
} satisfies Record<string, ProductId>;

export const dealIds = {
  deal1: makeId<"DealId">("deal-1"),
  deal2: makeId<"DealId">("deal-2"),
  deal4: makeId<"DealId">("deal-4"),
  deal8: makeId<"DealId">("deal-8"),
  deal9: makeId<"DealId">("deal-9"),
  deal10: makeId<"DealId">("deal-10"),
  deal13: makeId<"DealId">("deal-13"),
  deal14: makeId<"DealId">("deal-14"),
  deal16: makeId<"DealId">("deal-16"),
  deal17: makeId<"DealId">("deal-17"),
  deal19: makeId<"DealId">("deal-19"),
  deal22: makeId<"DealId">("deal-22"),
  deal23: makeId<"DealId">("deal-23"),
  deal24: makeId<"DealId">("deal-24"),
  // ── Reference end-to-end deals for the demo (#305): the full funnel path with
  // intermediate artifacts at every completed stage. ──
  ref1: makeId<"DealId">("deal-ref-1"),
  ref2: makeId<"DealId">("deal-ref-2"),
  ref3: makeId<"DealId">("deal-ref-3"),
  ref4: makeId<"DealId">("deal-ref-4"),
  ref5: makeId<"DealId">("deal-ref-5"),
} satisfies Record<string, DealId>;
