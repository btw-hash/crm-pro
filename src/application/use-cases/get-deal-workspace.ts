import type { ActivityRepository } from "@/application/ports/activity-repository";
import type { AuditRepository } from "@/application/ports/audit-repository";
import type { DealEventRepository } from "@/application/ports/deal-event-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { SampleRequestRepository } from "@/application/ports/sample-request-repository";
import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { TestActRepository } from "@/application/ports/test-act-repository";
import { type Activity, type ActivityKind, nextStep } from "@/domain/activity/activity";
import type { ProductionAudit } from "@/domain/audit/production-audit";
import type { DealEvent, DealEventType } from "@/domain/deal-event/deal-event";
import type { Deal, DealId } from "@/domain/deal/deal";
import type { SampleRequest } from "@/domain/sample/sample-request";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Shipment } from "@/domain/shipment/shipment";
import type { Viewer } from "@/domain/shared/viewer";
import type { TestAct } from "@/domain/test-act/test-act";

/**
 * A feed entry: either a manual activity (call/visit/note/task) OR a system
 * event (stage change, etc.) — unified and chronological, like in a legacy CRM.
 */
export type TimelineEntry =
  | {
      readonly source: "activity";
      readonly id: string;
      readonly at: string;
      readonly activityKind: ActivityKind;
      readonly text: string;
      readonly author: string;
      readonly openTask: boolean;
    }
  | {
      readonly source: "event";
      readonly id: string;
      readonly at: string;
      readonly eventType: DealEventType;
      readonly text: string;
      readonly author: string;
    };

export interface DealWorkspace {
  readonly deal: Deal;
  readonly audit: ProductionAudit | null;
  readonly testAct: TestAct | null;
  /** All acts for the deal (for the "Technologist response" stage — may be of different types). */
  readonly testActs: readonly TestAct[];
  readonly sampleRequests: readonly SampleRequest[];
  readonly activities: readonly Activity[];
  /** Merged feed: activities + system events, newest first. */
  readonly timeline: readonly TimelineEntry[];
  /** The open task with the nearest due date — the deal's "next step". */
  readonly nextStep: Activity | null;
  /** The shipment created from this deal's order; null — no order placed yet. */
  readonly shipment: Shipment | null;
}

function buildTimeline(
  activities: readonly Activity[],
  events: readonly DealEvent[],
): readonly TimelineEntry[] {
  const fromActivities: TimelineEntry[] = activities.map((a) => ({
    source: "activity",
    id: a.id,
    at: a.createdAt,
    activityKind: a.kind,
    text: a.text,
    author: a.author,
    openTask: a.kind === "task" && !a.done,
  }));
  const fromEvents: TimelineEntry[] = events.map((e) => ({
    source: "event",
    id: e.id,
    at: e.createdAt,
    eventType: e.type,
    text: e.summary,
    author: e.actor,
  }));
  return [...fromActivities, ...fromEvents].sort((a, b) => b.at.localeCompare(a.at));
}

export type GetDealWorkspace = (dealId: DealId, viewer: Viewer) => Promise<DealWorkspace | null>;

/**
 * Data for the deal screen: the deal + its audit, act, sample requests, and
 * feed. Access: a Manager only sees their own deals (another manager's →
 * null, the page shows a 404); the head of sales and the technologist
 * (shared test queue) see any deal.
 */
export function makeGetDealWorkspace(deps: {
  deals: DealRepository;
  audits: AuditRepository;
  testActs: TestActRepository;
  samples: SampleRequestRepository;
  activities: ActivityRepository;
  events: DealEventRepository;
  shipments: ShipmentRepository;
}): GetDealWorkspace {
  return async function getDealWorkspace(dealId, viewer) {
    const deal = await deps.deals.findById(dealId);
    if (!deal) {
      return null;
    }
    if (isOwnerScoped(viewer.role) && deal.responsibleManagerId !== viewer.id) {
      return null;
    }
    const [audit, testAct, testActs, sampleRequests, activities, events, shipment] =
      await Promise.all([
        deps.audits.findByDealId(dealId),
        deps.testActs.findByDealId(dealId),
        deps.testActs.listByDealId(dealId),
        deps.samples.listByDeal(dealId),
        deps.activities.listByDeal(dealId),
        deps.events.listByDeal(dealId),
        deps.shipments.findByDealId(dealId),
      ]);
    return {
      deal,
      audit,
      testAct,
      testActs,
      sampleRequests,
      activities,
      timeline: buildTimeline(activities, events),
      nextStep: nextStep(activities),
      shipment,
    };
  };
}
