import type { AssortmentRowView } from "@/application/use-cases/get-assortment-analysis";
import type { ProcurementRowView } from "@/application/use-cases/get-procurement-analysis";
import type { DealWithStatus } from "@/application/use-cases/list-deals-with-status";
import type { Activity, ActivityKind } from "@/domain/activity/activity";
import type { ClientId } from "@/domain/client/client";
import type { DealHealth } from "@/domain/deal/deal-attention";
import { isDefectReleased, type DefectItem } from "@/domain/defect/defect-item";
import type { Onboarding } from "@/domain/onboarding/onboarding";
import { isPackingDone, type PackingRequest } from "@/domain/packing/packing-request";
import type { TechRequest, TechRequestKind } from "@/domain/tech-request/tech-request";

/**
 * Pure aggregates for the role-based "Home" dashboard (bento dashboard #190). Turn the
 * results of existing use-cases into counters/selections of "what should I do right now".
 * Side-effect free, deterministic (`today` is passed in) — testable in isolation.
 */

// ─── Manager's tasks: bucketed by urgency ──────────────────────────────────
export interface TaskBuckets {
  readonly overdue: readonly Activity[];
  readonly today: readonly Activity[];
  readonly upcoming: readonly Activity[];
  /** Open tasks with no due date — not urgent, but in progress. */
  readonly noDue: readonly Activity[];
}

const byDue = (a: Activity, b: Activity): number =>
  (a.dueDate ?? "").localeCompare(b.dueDate ?? "");

export function bucketTasks(openTasks: readonly Activity[], today: string): TaskBuckets {
  const day = today.slice(0, 10);
  const overdue: Activity[] = [];
  const todayBucket: Activity[] = [];
  const upcoming: Activity[] = [];
  const noDue: Activity[] = [];
  for (const task of openTasks) {
    if (!task.dueDate) {
      noDue.push(task);
      continue;
    }
    const due = task.dueDate.slice(0, 10);
    if (due < day) overdue.push(task);
    else if (due === day) todayBucket.push(task);
    else upcoming.push(task);
  }
  return {
    overdue: [...overdue].sort(byDue),
    today: [...todayBucket].sort(byDue),
    upcoming: [...upcoming].sort(byDue),
    noDue,
  };
}

// ─── Manager's "Recent activity" feed ──────────────────────────────────────
/** A row in the recent activity feed: kind (for the icon), text, client, when. */
export interface RecentActivity {
  readonly kind: ActivityKind;
  readonly text: string;
  readonly clientName: string | null;
  readonly createdAt: string;
}

/** Max rows in the "Recent activity" tile (matches the reference design). */
const RECENT_FEED_LIMIT = 3;

/**
 * A sales manager's recent activity feed: sorts by time (newest first), takes the top
 * `RECENT_FEED_LIMIT`. The client name is filled in via `resolveClient` (id → name), so
 * the aggregate doesn't depend on a repository. Pure function, deterministic.
 */
export function recentActivityFeed(
  entries: readonly { activity: Activity; clientId: ClientId | null }[],
  resolveClient: (id: ClientId) => string | null,
): readonly RecentActivity[] {
  return [...entries]
    .sort((a, b) => b.activity.createdAt.localeCompare(a.activity.createdAt))
    .slice(0, RECENT_FEED_LIMIT)
    .map(({ activity, clientId }) => ({
      kind: activity.kind,
      text: activity.text,
      clientName: clientId ? resolveClient(clientId) : null,
      createdAt: activity.createdAt,
    }));
}

// ─── Manager's deals: counters + "hot" ones on top ─────────────────────────
const HEALTH_RANK: Record<DealHealth, number> = {
  critical: 0,
  attention: 1,
  healthy: 2,
  neutral: 3,
};

export interface DealsSummary {
  /** Active (non-terminal) deals. */
  readonly total: number;
  readonly critical: number;
  readonly attention: number;
  readonly needsNextStep: number;
  /** Needing action, critical ones on top, then by "longest stalled". */
  readonly hot: readonly DealWithStatus[];
}

export function summarizeDeals(items: readonly DealWithStatus[]): DealsSummary {
  const active = items.filter((i) => i.health !== "neutral");
  const hot = active.filter(
    (i) => i.health === "critical" || i.health === "attention" || i.needsNextStep,
  );
  return {
    total: active.length,
    critical: active.filter((i) => i.health === "critical").length,
    attention: active.filter((i) => i.health === "attention").length,
    needsNextStep: active.filter((i) => i.needsNextStep).length,
    hot: [...hot].sort(
      (a, b) =>
        HEALTH_RANK[a.health] - HEALTH_RANK[b.health] ||
        (b.daysOnStage ?? -1) - (a.daysOnStage ?? -1),
    ),
  };
}

// ─── Team (head of sales): workload by manager ─────────────────────────────
export interface TeamRow {
  readonly managerId: string;
  readonly activeDeals: number;
  readonly stalled: number;
  readonly needsNextStep: number;
}

export function summarizeTeam(items: readonly DealWithStatus[]): readonly TeamRow[] {
  const map = new Map<string, { activeDeals: number; stalled: number; needsNextStep: number }>();
  for (const item of items) {
    if (item.health === "neutral") continue; // only active deals
    const key = item.deal.responsibleManagerId;
    const row = map.get(key) ?? { activeDeals: 0, stalled: 0, needsNextStep: 0 };
    row.activeDeals += 1;
    if (item.stale) row.stalled += 1;
    if (item.needsNextStep) row.needsNextStep += 1;
    map.set(key, row);
  }
  return [...map.entries()]
    .map(([managerId, r]) => ({ managerId, ...r }))
    .sort(
      (a, b) =>
        b.stalled - a.stalled ||
        b.needsNextStep - a.needsNextStep ||
        b.activeDeals - a.activeDeals ||
        a.managerId.localeCompare(b.managerId),
    );
}

// ─── Procurement / assortment: signal counters ─────────────────────────────
export interface ProcurementCounts {
  readonly shortage: number;
  readonly ok: number;
  readonly overstock: number;
}

export function countProcurementSignals(rows: readonly ProcurementRowView[]): ProcurementCounts {
  return {
    shortage: rows.filter((r) => r.signal === "shortage").length,
    ok: rows.filter((r) => r.signal === "ok").length,
    overstock: rows.filter((r) => r.signal === "overstock").length,
  };
}

export interface AssortmentCounts {
  readonly grow: number;
  readonly hold: number;
  readonly stop: number;
}

export function countAssortmentTrends(rows: readonly AssortmentRowView[]): AssortmentCounts {
  return {
    grow: rows.filter((r) => r.trend === "growth").length,
    hold: rows.filter((r) => r.trend === "stable").length,
    stop: rows.filter((r) => r.trend === "dead" || r.trend === "declining").length,
  };
}

// ─── Tech queue ─────────────────────────────────────────────────────────────
export interface TechQueueSummary {
  readonly open: number;
  readonly inProgress: number;
  /** In progress, assigned to this technologist. */
  readonly mine: number;
  readonly byKind: Record<TechRequestKind, number>;
}

export function summarizeTechQueue(
  reqs: readonly TechRequest[],
  viewerId: string,
): TechQueueSummary {
  const active = reqs.filter((r) => r.status !== "done");
  const byKind: Record<TechRequestKind, number> = {
    consult: 0,
    onsite: 0,
    test: 0,
    demo: 0,
    audit_req: 0,
  };
  for (const req of active) byKind[req.kind] += 1;
  return {
    open: reqs.filter((r) => r.status === "open").length,
    inProgress: reqs.filter((r) => r.status === "in_progress").length,
    mine: active.filter((r) => r.assignedTo === viewerId).length,
    byKind,
  };
}

// ─── Operational queues (procurement) ──────────────────────────────────────
export function countOpenPacking(reqs: readonly PackingRequest[]): number {
  return reqs.filter((r) => !isPackingDone(r.status)).length;
}

export function countOpenDefects(items: readonly DefectItem[]): number {
  return items.filter((i) => !isDefectReleased(i.status)).length;
}

export function countActiveOnboardings(list: readonly Onboarding[]): number {
  return list.filter((o) => o.status === "collecting" || o.status === "legal_review").length;
}
