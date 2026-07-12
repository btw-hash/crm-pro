import { describe, expect, it } from "vitest";
import type { AssortmentRowView } from "@/application/use-cases/get-assortment-analysis";
import type { ProcurementRowView } from "@/application/use-cases/get-procurement-analysis";
import type { DealWithStatus } from "@/application/use-cases/list-deals-with-status";
import type { Activity, ActivityId } from "@/domain/activity/activity";
import type { ClientId } from "@/domain/client/client";
import type { Deal, DealId } from "@/domain/deal/deal";
import type { DealHealth } from "@/domain/deal/deal-attention";
import { makeId } from "@/domain/shared/id";
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
} from "./home-aggregate";
import type { DefectItem } from "@/domain/defect/defect-item";
import type { Onboarding } from "@/domain/onboarding/onboarding";
import type { PackingRequest } from "@/domain/packing/packing-request";

function task(id: string, dueDate: string | null): Activity {
  return {
    id: makeId<"ActivityId">(id) as ActivityId,
    dealId: makeId<"DealId">("d1") as DealId,
    clientId: null,
    kind: "task",
    text: `task ${id}`,
    author: "m1",
    createdAt: "2026-06-01T00:00:00.000Z",
    dueDate,
    done: false,
  };
}

function deal(managerId: string): Deal {
  return {
    id: makeId<"DealId">(`deal-${managerId}-${Math.round(0)}`) as DealId,
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage: "qualification",
    responsibleManagerId: managerId,
  };
}

function dws(
  managerId: string,
  health: DealHealth,
  opts: { stale?: boolean; needsNextStep?: boolean; daysOnStage?: number | null } = {},
): DealWithStatus {
  return {
    deal: deal(managerId),
    needsNextStep: opts.needsNextStep ?? false,
    daysOnStage: opts.daysOnStage ?? null,
    stale: opts.stale ?? false,
    health,
  };
}

describe("bucketTasks", () => {
  const buckets = bucketTasks(
    [
      task("a", "2026-06-24"),
      task("b", "2026-06-25"),
      task("c", "2026-06-26"),
      task("d", null),
      task("e", "2026-06-20"),
    ],
    "2026-06-25T09:00:00.000Z",
  );

  it("buckets by urgency relative to today", () => {
    expect(buckets.overdue.map((t) => t.id)).toEqual(["e", "a"]); // sorted by due date
    expect(buckets.today.map((t) => t.id)).toEqual(["b"]);
    expect(buckets.upcoming.map((t) => t.id)).toEqual(["c"]);
    expect(buckets.noDue.map((t) => t.id)).toEqual(["d"]);
  });
});

describe("recentActivityFeed", () => {
  function act(id: string, kind: Activity["kind"], createdAt: string): Activity {
    return {
      id: makeId<"ActivityId">(id) as ActivityId,
      dealId: makeId<"DealId">("d1") as DealId,
      clientId: makeId<"ClientId">("c1") as ClientId,
      kind,
      text: `activity ${id}`,
      author: "m1",
      createdAt,
      dueDate: null,
      done: false,
    };
  }
  const resolve = (id: ClientId): string | null => (id === "c1" ? "Sunrise Bakery Co." : null);

  it("sorts by time (newest first), limits the result, and fills in the client name", () => {
    const feed = recentActivityFeed(
      [
        { activity: act("a", "call", "2026-06-20T10:00:00.000Z"), clientId: "c1" as ClientId },
        { activity: act("b", "note", "2026-06-24T10:00:00.000Z"), clientId: "c1" as ClientId },
        { activity: act("c", "visit", "2026-06-22T10:00:00.000Z"), clientId: null },
        { activity: act("d", "task", "2026-06-19T10:00:00.000Z"), clientId: "c1" as ClientId },
      ],
      resolve,
    );
    expect(feed).toHaveLength(3); // limit of 3
    expect(feed.map((f) => f.kind)).toEqual(["note", "visit", "call"]); // b, c, a
    expect(feed[0]?.clientName).toBe("Sunrise Bakery Co.");
    expect(feed[1]?.clientName).toBeNull(); // no client
  });
});

describe("summarizeDeals", () => {
  const summary = summarizeDeals([
    dws("m1", "healthy"),
    dws("m1", "attention", { needsNextStep: true, daysOnStage: 8 }),
    dws("m1", "critical", { stale: true, daysOnStage: 20 }),
    dws("m1", "neutral"), // terminal — not counted
  ]);

  it("counts only active deals: critical / attention / no next step", () => {
    expect(summary.total).toBe(3);
    expect(summary.critical).toBe(1);
    expect(summary.attention).toBe(1);
    expect(summary.needsNextStep).toBe(1);
  });

  it('hot deals on top: critical first, then by "longest stalled"', () => {
    expect(summary.hot).toHaveLength(2);
    expect(summary.hot[0]?.health).toBe("critical");
    expect(summary.hot[1]?.health).toBe("attention");
  });
});

describe("summarizeTeam", () => {
  const team = summarizeTeam([
    dws("peterson", "healthy"),
    dws("peterson", "critical", { stale: true }),
    dws("griffin", "attention", { needsNextStep: true }),
    dws("griffin", "neutral"), // not counted
  ]);

  it("groups active deals by manager, with problem cases on top", () => {
    expect(team).toHaveLength(2);
    expect(team[0]?.managerId).toBe("peterson"); // has a stalled deal → ranks higher
    expect(team[0]?.activeDeals).toBe(2);
    expect(team[0]?.stalled).toBe(1);
    expect(team[1]?.managerId).toBe("griffin");
    expect(team[1]?.activeDeals).toBe(1);
    expect(team[1]?.needsNextStep).toBe(1);
  });
});

describe("countProcurementSignals / countAssortmentTrends", () => {
  it("counts procurement signals", () => {
    const rows = [
      { signal: "shortage" },
      { signal: "shortage" },
      { signal: "overstock" },
      { signal: "ok" },
    ] as ProcurementRowView[];
    expect(countProcurementSignals(rows)).toEqual({ shortage: 2, ok: 1, overstock: 1 });
  });

  it("groups assortment trends (stop = dead + declining)", () => {
    const rows = [
      { trend: "growth" },
      { trend: "stable" },
      { trend: "dead" },
      { trend: "declining" },
    ] as AssortmentRowView[];
    expect(countAssortmentTrends(rows)).toEqual({ grow: 1, hold: 1, stop: 2 });
  });
});

describe("summarizeTechQueue", () => {
  it("counts open/in_progress/mine + breakdown by kind", () => {
    const reqs = [
      { status: "open", kind: "consult", assignedTo: null },
      { status: "in_progress", kind: "test", assignedTo: "tech1" },
      { status: "in_progress", kind: "onsite", assignedTo: "tech2" },
      // a completed request assigned to the current technologist must NOT count toward mine/byKind
      { status: "done", kind: "test", assignedTo: "tech1" },
    ] as unknown as Parameters<typeof summarizeTechQueue>[0];
    const s = summarizeTechQueue(reqs, "tech1");
    expect(s.open).toBe(1);
    expect(s.inProgress).toBe(2);
    expect(s.mine).toBe(1); // tech1's done request doesn't count
    expect(s.byKind).toEqual({ consult: 1, onsite: 1, test: 1, demo: 0, audit_req: 0 }); // the done test request doesn't increment
  });
});

describe("operational counters (open queues)", () => {
  it("countOpenPacking counts only non-completed packing statuses", () => {
    const reqs = [
      { status: "requested" },
      { status: "in_progress" },
      { status: "done" },
    ] as unknown as readonly PackingRequest[];
    expect(countOpenPacking(reqs)).toBe(2);
  });

  it("countOpenDefects counts only non-released defect items", () => {
    const items = [
      { status: "on_defect_stock" },
      { status: "relabeling" },
      { status: "released" },
    ] as unknown as readonly DefectItem[];
    expect(countOpenDefects(items)).toBe(2);
  });

  it("countActiveOnboardings — only collecting / legal review, NOT approved and NOT rejected", () => {
    const list = [
      { status: "collecting" },
      { status: "legal_review" },
      { status: "approved" },
      { status: "rejected" }, // "needs revision" — but we don't count it as active (boundary case)
    ] as unknown as readonly Onboarding[];
    expect(countActiveOnboardings(list)).toBe(2);
  });
});
