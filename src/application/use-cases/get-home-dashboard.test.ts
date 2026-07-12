import { describe, expect, it, vi } from "vitest";
import type { Viewer } from "@/domain/shared/viewer";
import { makeGetHomeDashboard } from "./get-home-dashboard";

const NOW = "2026-06-26T00:00:00.000Z";

// Minimal fixtures: the use-case only reads part of the fields, so we build narrow objects.
const funnel = { total: 10, active: 4, won: 3, lost: 3, winRate: 0.5, byStage: [], byGoal: [] };
const sales = {
  totalRevenue: "$1,000",
  orderCount: 1,
  byManager: [],
  byProduct: [],
  byMonth: [],
  latestMonth: "2026-06",
  latestMonthRevenue: "$500",
  deltaVsPrevMonthPercent: 4,
  deltaVsPrevYearPercent: 10,
};

/** Builds deps with spies; each port returns a fixed stub. */
function makeDeps() {
  return {
    listDealsWithStatus: vi.fn(async () => []),
    getMyOpenTasks: vi.fn(async () => []),
    getFunnelAnalytics: vi.fn(async () => funnel),
    getSalesAnalytics: vi.fn(async () => sales),
    listOpenTechRequests: vi.fn(async () => []),
    getProcurementAnalysis: vi.fn(async () => []),
    getAssortmentAnalysis: vi.fn(async () => []),
    listPackingRequests: vi.fn(async () => []),
    listDefectItems: vi.fn(async () => []),
    listOnboardings: vi.fn(async () => []),
    countUnreadNotifications: vi.fn(async () => 2),
    clients: { list: vi.fn(async () => []) },
    activities: { listByDeal: vi.fn(async () => []) },
    now: () => NOW,
  } as unknown as Parameters<typeof makeGetHomeDashboard>[0] &
    Record<string, ReturnType<typeof vi.fn>>;
}

const viewer = (role: Viewer["role"], id = "u1"): Viewer => ({ id, role });

describe("getHomeDashboard", () => {
  it("Manager: personal slice (funnel/sales scoped to managerId), no total, tech queue not touched", async () => {
    const deps = makeDeps();
    const home = await makeGetHomeDashboard(deps)(viewer("mop", "owens"));

    expect(home.role).toBe("mop");
    expect(home.unread).toBe(2);
    expect(deps.getFunnelAnalytics).toHaveBeenCalledWith({ managerId: "owens" });
    expect(deps.getSalesAnalytics).toHaveBeenCalledWith({ managerId: "owens" });
    expect(deps.getMyOpenTasks).toHaveBeenCalledOnce();
    expect(deps.listOpenTechRequests).not.toHaveBeenCalled();
    if (home.role === "mop") {
      expect(home.funnel).toEqual({ active: 4, won: 3, winRate: 0.5 });
      expect("total" in home.funnel).toBe(false); // a manager has no total
      expect(home.revenue.latestMonthRevenue).toBe("$500");
      // Additive fields of the rich manager dashboard (#design-align-wave2).
      expect(home.funnelByStage).toEqual([]); // from funnel.byStage
      expect(home.clientNames).toEqual({}); // no clients in the fixture
      expect(home.recentActivity).toEqual([]); // no activities in the fixture
    }
  });

  it("Head of sales: department-wide (funnel WITHOUT scope, with total), team", async () => {
    const deps = makeDeps();
    const home = await makeGetHomeDashboard(deps)(viewer("head", "alex"));

    expect(home.role).toBe("head");
    expect(deps.getFunnelAnalytics).toHaveBeenCalledWith(); // no scope = the whole department
    expect(deps.getSalesAnalytics).toHaveBeenCalledWith();
    expect(deps.getMyOpenTasks).not.toHaveBeenCalled();
    if (home.role === "head") {
      expect(home.funnel.total).toBe(10); // the head of sales has a total
      expect(Array.isArray(home.team)).toBe(true);
    }
  });

  it("Technologist: only the request queue + notifications, no commercial data", async () => {
    const deps = makeDeps();
    const home = await makeGetHomeDashboard(deps)(viewer("technologist", "kent"));

    expect(home.role).toBe("technologist");
    expect(deps.listOpenTechRequests).toHaveBeenCalledOnce();
    expect(deps.getFunnelAnalytics).not.toHaveBeenCalled();
    expect(deps.getSalesAnalytics).not.toHaveBeenCalled();
    if (home.role === "technologist") {
      expect(home.queue.byKind).toEqual({ consult: 0, onsite: 0, test: 0, demo: 0, audit_req: 0 });
    }
  });

  it("Procurement: procurement/assortment signals + operational queues, no sales/funnel", async () => {
    const deps = makeDeps();
    const home = await makeGetHomeDashboard(deps)(viewer("procurement", "buyer"));

    expect(home.role).toBe("procurement");
    expect(deps.getProcurementAnalysis).toHaveBeenCalledOnce();
    expect(deps.getAssortmentAnalysis).toHaveBeenCalledOnce();
    expect(deps.listPackingRequests).toHaveBeenCalledOnce();
    expect(deps.getFunnelAnalytics).not.toHaveBeenCalled();
    if (home.role === "procurement") {
      expect(home.procurement).toEqual({ shortage: 0, ok: 0, overstock: 0 });
      expect(home.ops).toEqual({ packing: 0, defects: 0, onboardings: 0 });
    }
  });

  it("Accountant: notifications only, no commercial data or queues", async () => {
    const deps = makeDeps();
    const home = await makeGetHomeDashboard(deps)(viewer("accountant", "acc1"));

    expect(home.role).toBe("accountant");
    expect(home.unread).toBe(2);
    expect(deps.getFunnelAnalytics).not.toHaveBeenCalled();
    expect(deps.getSalesAnalytics).not.toHaveBeenCalled();
    expect(deps.listOpenTechRequests).not.toHaveBeenCalled();
  });

  it("Logist: notifications only, no commercial data or queues", async () => {
    const deps = makeDeps();
    const home = await makeGetHomeDashboard(deps)(viewer("logist", "log1"));

    expect(home.role).toBe("logist");
    expect(home.unread).toBe(2);
    expect(deps.getFunnelAnalytics).not.toHaveBeenCalled();
    expect(deps.getSalesAnalytics).not.toHaveBeenCalled();
  });
});
