import {
  bucketTasks,
  countActiveOnboardings,
  countAssortmentTrends,
  countOpenDefects,
  countOpenPacking,
  countProcurementSignals,
  recentActivityFeed,
  summarizeDeals,
  summarizeTeam,
  summarizeTechQueue,
  type AssortmentCounts,
  type DealsSummary,
  type ProcurementCounts,
  type RecentActivity,
  type TaskBuckets,
  type TeamRow,
  type TechQueueSummary,
} from "@/application/dashboard/home-aggregate";
import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { ClientId } from "@/domain/client/client";
import type { FunnelStageStat } from "@/domain/deal/funnel-analytics";
import type { GetAssortmentAnalysis } from "@/application/use-cases/get-assortment-analysis";
import type { GetFunnelAnalytics } from "@/application/use-cases/get-funnel-analytics";
import type { GetMyOpenTasks } from "@/application/use-cases/get-my-open-tasks";
import type { GetProcurementAnalysis } from "@/application/use-cases/get-procurement-analysis";
import type { GetSalesAnalytics } from "@/application/use-cases/get-sales-analytics";
import type { ListDealsWithStatus } from "@/application/use-cases/list-deals-with-status";
import type { ListDefectItems } from "@/application/use-cases/defect-items";
import type { ListOnboardings } from "@/application/use-cases/onboardings";
import type { ListOpenTechRequests } from "@/application/use-cases/list-tech-requests";
import type { ListPackingRequests } from "@/application/use-cases/packing-requests";
import type { CountUnreadNotifications } from "@/application/use-cases/count-unread-notifications";
import type { Viewer } from "@/domain/shared/viewer";

/** Revenue slice for the tile (personal for a manager / department-wide for the head). */
export interface RevenueTile {
  readonly totalRevenue: string;
  readonly latestMonth: string | null;
  readonly latestMonthRevenue: string;
  readonly deltaVsPrevMonthPercent: number | null;
}

export interface ManagerHome {
  readonly role: "mop";
  readonly unread: number;
  readonly tasks: TaskBuckets & { readonly openCount: number };
  readonly deals: DealsSummary;
  readonly funnel: { readonly active: number; readonly won: number; readonly winRate: number };
  readonly revenue: RevenueTile;
  /** Personal funnel by stage — for the "My funnel" bars and the qualification/test/proposal chips. */
  readonly funnelByStage: readonly FunnelStageStat[];
  /** Client names (clientId -> name) — for hero rows and "hot" deals. */
  readonly clientNames: Readonly<Record<string, string>>;
  /** The manager's recent activities (any kind) — the "Recent tasks" tile. */
  readonly recentActivity: readonly RecentActivity[];
}

export interface HeadHome {
  readonly role: "head";
  readonly unread: number;
  readonly team: readonly TeamRow[];
  readonly deals: DealsSummary;
  readonly funnel: {
    readonly total: number;
    readonly active: number;
    readonly won: number;
    readonly winRate: number;
  };
  readonly revenue: RevenueTile;
}

export interface TechnologistHome {
  readonly role: "technologist";
  readonly unread: number;
  readonly queue: TechQueueSummary;
}

export interface ProcurementHome {
  readonly role: "procurement";
  readonly unread: number;
  readonly procurement: ProcurementCounts;
  readonly assortment: AssortmentCounts;
  readonly ops: {
    readonly packing: number;
    readonly defects: number;
    readonly onboardings: number;
  };
}

/** Minimal dashboard for operational roles (accountant/logist): notification count only. */
export interface OperationalHome {
  readonly role: "accountant" | "logist";
  readonly unread: number;
}

export type HomeDashboard =
  | ManagerHome
  | HeadHome
  | TechnologistHome
  | ProcurementHome
  | OperationalHome;

export type GetHomeDashboard = (viewer: Viewer) => Promise<HomeDashboard>;

/**
 * Role-based "Home" (#190): assembles a "what should I do right now" dashboard
 * from existing use-cases, per the viewer's role. Doesn't duplicate logic —
 * composes it (the manager's owner boundary comes from listDealsWithStatus/
 * getMyOpenTasks; numbers come from the ERP deterministically, no AI call).
 */
export function makeGetHomeDashboard(deps: {
  listDealsWithStatus: ListDealsWithStatus;
  getMyOpenTasks: GetMyOpenTasks;
  getFunnelAnalytics: GetFunnelAnalytics;
  getSalesAnalytics: GetSalesAnalytics;
  listOpenTechRequests: ListOpenTechRequests;
  getProcurementAnalysis: GetProcurementAnalysis;
  getAssortmentAnalysis: GetAssortmentAnalysis;
  listPackingRequests: ListPackingRequests;
  listDefectItems: ListDefectItems;
  listOnboardings: ListOnboardings;
  countUnreadNotifications: CountUnreadNotifications;
  /** Clients — to substitute names by clientId in hero rows/"hot" deals (manager). */
  clients: ClientRepository;
  /** Activities — for the "Recent tasks" feed (manager). */
  activities: ActivityRepository;
  /** Current time (ISO) — injected for determinism/tests. */
  now?: () => string;
}): GetHomeDashboard {
  const nowIso = deps.now ?? (() => new Date().toISOString());
  return async (viewer) => {
    const unread = await deps.countUnreadNotifications(viewer.id);
    switch (viewer.role) {
      case "mop": {
        const [statuses, openTasks, funnel, sales, clients] = await Promise.all([
          deps.listDealsWithStatus(viewer),
          deps.getMyOpenTasks(viewer),
          deps.getFunnelAnalytics({ managerId: viewer.id }),
          deps.getSalesAnalytics({ managerId: viewer.id }),
          deps.clients.list(),
        ]);
        // Client names only for the manager's own portfolio (there's no owner boundary
        // on the client repository — filter by responsibleManagerId, as listClients does).
        const clientNames: Record<string, string> = {};
        for (const client of clients) {
          if (client.responsibleManagerId === viewer.id) clientNames[client.id] = client.name;
        }
        // "Recent tasks" feed: activities on the manager's deals, newest first (deterministic).
        const perDeal = await Promise.all(
          statuses.map(async (s) => ({
            activities: await deps.activities.listByDeal(s.deal.id),
            clientId: s.deal.clientId,
          })),
        );
        const feed = perDeal.flatMap((entry) =>
          entry.activities.map((activity) => ({ activity, clientId: entry.clientId })),
        );
        return {
          role: "mop",
          unread,
          tasks: { ...bucketTasks(openTasks, nowIso()), openCount: openTasks.length },
          deals: summarizeDeals(statuses),
          funnel: { active: funnel.active, won: funnel.won, winRate: funnel.winRate },
          revenue: {
            totalRevenue: sales.totalRevenue,
            latestMonth: sales.latestMonth,
            latestMonthRevenue: sales.latestMonthRevenue,
            deltaVsPrevMonthPercent: sales.deltaVsPrevMonthPercent,
          },
          funnelByStage: funnel.byStage,
          clientNames,
          recentActivity: recentActivityFeed(feed, (id: ClientId) => clientNames[id] ?? null),
        };
      }
      case "head": {
        const [statuses, funnel, sales] = await Promise.all([
          deps.listDealsWithStatus(viewer),
          deps.getFunnelAnalytics(),
          deps.getSalesAnalytics(),
        ]);
        return {
          role: "head",
          unread,
          team: summarizeTeam(statuses),
          deals: summarizeDeals(statuses),
          funnel: {
            total: funnel.total,
            active: funnel.active,
            won: funnel.won,
            winRate: funnel.winRate,
          },
          revenue: {
            totalRevenue: sales.totalRevenue,
            latestMonth: sales.latestMonth,
            latestMonthRevenue: sales.latestMonthRevenue,
            deltaVsPrevMonthPercent: sales.deltaVsPrevMonthPercent,
          },
        };
      }
      case "technologist": {
        const reqs = await deps.listOpenTechRequests();
        return { role: "technologist", unread, queue: summarizeTechQueue(reqs, viewer.id) };
      }
      case "procurement": {
        const [proc, assort, packing, defects, onboardings] = await Promise.all([
          deps.getProcurementAnalysis(),
          deps.getAssortmentAnalysis(),
          deps.listPackingRequests(),
          deps.listDefectItems(),
          deps.listOnboardings(),
        ]);
        return {
          role: "procurement",
          unread,
          procurement: countProcurementSignals(proc),
          assortment: countAssortmentTrends(assort),
          ops: {
            packing: countOpenPacking(packing),
            defects: countOpenDefects(defects),
            onboardings: countActiveOnboardings(onboardings),
          },
        };
      }
      case "accountant":
      case "logist": {
        return { role: viewer.role, unread };
      }
      default: {
        const exhaustive: never = viewer.role;
        throw new Error(`Unknown role: ${String(exhaustive)}`);
      }
    }
  };
}
