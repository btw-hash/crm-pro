import { createQuota } from "@/domain/quota/quota";
import type { Quota } from "@/domain/quota/quota";
import type { DeficitRequestInput } from "@/domain/deficit/deficit-scoring";
import { makeId } from "@/domain/shared/id";
import { createTechRequest } from "@/domain/tech-request/tech-request";
import type { TechRequest } from "@/domain/tech-request/tech-request";
import type { SeedUser } from "../in-memory-user-repository";
import {
  managers,
  heads,
  buyers,
  technologists,
  accountants,
  logists,
  clientIds,
  productIds,
} from "./refs";
export const seedTechRequests: readonly TechRequest[] = [
  createTechRequest({
    id: makeId<"TechRequestId">("tr-1"),
    dealId: makeId<"DealId">("deal-4"),
    clientId: clientIds.warmBread,
    productId: productIds.levara,
    kind: "onsite",
    note: "On-site visit to trial the Levara starter on hearth breads",
    requestedBy: managers.mills,
    createdAt: "2026-06-23T09:00:00Z",
  }),
  {
    ...createTechRequest({
      id: makeId<"TechRequestId">("tr-2"),
      dealId: makeId<"DealId">("deal-1"),
      clientId: clientIds.sweetWorld,
      kind: "consult",
      note: "Consultation on Coverlux Cover glaze dosage during baking",
      requestedBy: managers.grant,
      createdAt: "2026-06-22T14:00:00Z",
    }),
    status: "in_progress" as const,
    assignedTo: technologists.kent,
  },
  // ── Requests to the technologist from newer sales managers (fills the queue) ──
  createTechRequest({
    id: makeId<"TechRequestId">("tr-3"),
    dealId: makeId<"DealId">("deal-16"),
    clientId: clientIds.seaBreeze,
    productId: productIds.coverluxGlaze,
    kind: "onsite",
    note: "On-site visit to Sea Breeze Cafe — trialing Coverlux Cover glaze on desserts",
    requestedBy: managers.morozova,
    createdAt: "2026-06-23T10:30:00Z",
  }),
  createTechRequest({
    id: makeId<"TechRequestId">("tr-4"),
    dealId: makeId<"DealId">("deal-13"),
    clientId: clientIds.confiLux,
    productId: productIds.noirelle,
    kind: "consult",
    note: "Consultation on tempering Noirelle for the premium line",
    requestedBy: managers.volkov,
    createdAt: "2026-06-23T11:15:00Z",
  }),
  {
    ...createTechRequest({
      id: makeId<"TechRequestId">("tr-5"),
      dealId: makeId<"DealId">("deal-11"),
      clientId: clientIds.coastalBread,
      productId: productIds.p500,
      kind: "onsite",
      note: "Line audit at Coastal Bakery Works for the P500 improver",
      requestedBy: managers.kozlov,
      createdAt: "2026-06-22T09:30:00Z",
    }),
    status: "in_progress" as const,
    assignedTo: technologists.derek,
  },
];

// Demo accounts. id matches deals' responsibleManagerId (owner-based visibility keeps
// working). Shared demo password `demo1234` — synthetic data, not PII. In production
// accounts are created from the ERP directory, passwords are set by an administrator.
export const DEMO_PASSWORD = "demo1234";
export const seedUsers: readonly SeedUser[] = [
  {
    id: heads.alexander,
    username: "a.peterson",
    name: "Alan Peterson",
    role: "head",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.owens,
    username: "d.owens",
    name: "Daniel Owens",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.grant,
    username: "bennett",
    name: "Bennett",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.mills,
    username: "coleman",
    name: "Coleman",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.kozlov,
    username: "fischer",
    name: "Fischer",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.morozova,
    username: "nolan",
    name: "Nolan",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.volkov,
    username: "barrett",
    name: "Barrett",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: managers.novikova,
    username: "sawyer",
    name: "Sawyer",
    role: "mop",
    password: DEMO_PASSWORD,
  },
  {
    id: technologists.kent,
    username: "m.kent",
    name: "Maria Kent",
    role: "technologist",
    password: DEMO_PASSWORD,
  },
  {
    id: technologists.derek,
    username: "ncole",
    name: "Technologist Nathan Cole",
    role: "technologist",
    password: DEMO_PASSWORD,
  },
  {
    id: buyers.demo,
    username: "s.griffin",
    name: "Sam Griffin",
    role: "procurement",
    password: DEMO_PASSWORD,
  },
  {
    id: accountants.demo,
    username: "o.mills",
    name: "Olivia Mills",
    role: "accountant",
    password: DEMO_PASSWORD,
  },
  {
    id: logists.demo,
    username: "p.grant",
    name: "Peter Grant",
    role: "logist",
    password: DEMO_PASSWORD,
  },
];

// Demo quotas: personal volume reserves against the sales managers' plan (Q3 2026).
// Shows different states: free balance remaining, nearly exhausted, exhausted.
export const seedQuotas: readonly Quota[] = [
  createQuota({
    id: makeId<"QuotaId">("quota-owens-noirelle"),
    mopId: managers.owens,
    productId: productIds.noirelle,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 500,
    reservedVolume: 120,
    soldVolume: 200,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-owens-p500"),
    mopId: managers.owens,
    productId: productIds.p500,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 2000,
    reservedVolume: 300,
    soldVolume: 1500,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-grant-fruitfil"),
    mopId: managers.grant,
    productId: productIds.fruitfil,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 300,
    reservedVolume: 80,
    soldVolume: 60,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-grant-laminor"),
    mopId: managers.grant,
    productId: productIds.laminor,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 150,
    reservedVolume: 70,
    soldVolume: 75,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-mills-levara"),
    mopId: managers.mills,
    productId: productIds.levara,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 200,
    reservedVolume: 30,
    soldVolume: 140,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-mills-coverluxGlaze"),
    mopId: managers.mills,
    productId: productIds.coverluxGlaze,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 400,
    reservedVolume: 150,
    soldVolume: 100,
  }),
  // ── Quotas for newer managers (different states: free / nearly exhausted / exhausted) ──
  createQuota({
    id: makeId<"QuotaId">("quota-kozlov-noirelle"),
    mopId: managers.kozlov,
    productId: productIds.noirelle,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 800,
    reservedVolume: 200,
    soldVolume: 400,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-kozlov-p500"),
    mopId: managers.kozlov,
    productId: productIds.p500,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 1200,
    reservedVolume: 100,
    soldVolume: 1050,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-volkov-noirelle"),
    mopId: managers.volkov,
    productId: productIds.noirelle,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 400,
    reservedVolume: 150,
    soldVolume: 250,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-volkov-coverluxGlaze"),
    mopId: managers.volkov,
    productId: productIds.coverluxGlaze,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 350,
    reservedVolume: 80,
    soldVolume: 120,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-morozova-coverluxGlaze"),
    mopId: managers.morozova,
    productId: productIds.coverluxGlaze,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 120,
    reservedVolume: 30,
    soldVolume: 50,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-novikova-levara"),
    mopId: managers.novikova,
    productId: productIds.levara,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 150,
    reservedVolume: 40,
    soldVolume: 60,
  }),
  createQuota({
    id: makeId<"QuotaId">("quota-novikova-fruitfil"),
    mopId: managers.novikova,
    productId: productIds.fruitfil,
    period: { year: 2026, quarter: 3 },
    plannedVolume: 200,
    reservedVolume: 90,
    soldVolume: 80,
  }),
];

// Demo requests for a deficit item: Fruitfil (freeQuantity=0) across different
// clients/margins. Used in /procurement to demonstrate deficit scoring.
export const seedDeficitRequests: readonly DeficitRequestInput[] = [
  {
    requestId: makeId<"DeficitRequestId">("def-req-1"),
    clientStatus: "A",
    needType: "production_stop",
    shelfLifeDays: 2,
    marginPercent: 38,
    requestedQty: 80,
  },
  {
    requestId: makeId<"DeficitRequestId">("def-req-2"),
    clientStatus: "B",
    needType: "scheduled",
    shelfLifeDays: 10,
    marginPercent: 55,
    requestedQty: 120,
  },
  {
    requestId: makeId<"DeficitRequestId">("def-req-3"),
    clientStatus: "A",
    needType: "scheduled",
    shelfLifeDays: 5,
    marginPercent: 42,
    requestedQty: 60,
  },
  {
    requestId: makeId<"DeficitRequestId">("def-req-4"),
    clientStatus: "C",
    needType: "trial",
    shelfLifeDays: 20,
    marginPercent: 30,
    requestedQty: 40,
  },
];

/** Available balance of the deficit item for the demo (Fruitfil Lingonberry Filling). */
export const DEMO_DEFICIT_AVAILABLE_QTY = 150;
