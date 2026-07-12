"use server";

import type { DealHealth } from "@/domain/deal/deal-attention";
import { DEAL_GOAL_LABELS, DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { ACTIVITY_KIND_LABELS, type ActivityKind } from "@/domain/activity/activity";
import { DEAL_EVENT_TYPE_LABELS } from "@/domain/deal-event/deal-event";
import { DEAL_STAGE_LABELS, type DealStage, FUNNEL_TRACK } from "@/domain/deal/deal-stage";
import { TECH_REQUEST_STATUS_LABELS } from "@/domain/tech-request/tech-request";
import { makeId } from "@/domain/shared/id";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { managerLabel, personLabel } from "@/infrastructure/persistence/seed";
import { type OutcomeBadge, outcomeBadge } from "../_lib/deal-outcome";

/** Visual icon type for a timeline activity in the drawer (call/email/other). */
export type DrawerTimelineKind = "call" | "email" | "other";

/** A single entry in the drawer's short activity timeline. */
export interface DrawerTimelineEntry {
  readonly id: string;
  readonly kindLabel: string;
  /** Type used to pick a colored icon in the timeline (see the "warm theme" reference). */
  readonly kind: DrawerTimelineKind;
  readonly text: string;
  readonly author: string;
  readonly at: string;
}

/** A single "Stage track" pill with precomputed colors (design reference). */
export interface DrawerTrackStage {
  readonly label: string;
  readonly bg: string;
  readonly color: string;
}

/**
 * Focused deal-card data for the side drawer: heading, key fields, Score Pill
 * (health), and a short timeline. Intentionally does NOT drag in the 15 sections
 * of the full page — for depth there's an "Open full deal" link to /deals/[id].
 */
export interface DealDrawerData {
  readonly id: string;
  readonly title: string;
  readonly stageLabel: string;
  readonly stage: DealStage;
  readonly managerName: string;
  /** Manager initials for the avatar (e.g. "AS"). Computed on the server. */
  readonly managerInitials: string;
  /** Manager avatar background color (design reference palette). Computed on the server. */
  readonly managerBg: string;
  readonly clientId: string;
  readonly clientName: string;
  readonly goalLabel: string;
  /** Free-form comment on the deal; null — not set. */
  readonly comment: string | null;
  readonly health: DealHealth;
  /** Outcome badge for a completed deal (Won/Lost); null — not completed. */
  readonly outcome: OutcomeBadge | null;
  readonly nextStep: { readonly text: string; readonly dueDate: string | null } | null;
  /** Stage track as pills with precomputed colors (past/current/future). */
  readonly track: readonly DrawerTrackStage[];
  readonly timeline: readonly DrawerTimelineEntry[];
  /** Status of the latest tech request (for the testing stage, item 17 #394). null — no request. */
  readonly techRequestStatus: { label: string; status: string } | null;
}

/** Responsible-manager avatar background color by surname (warm-theme design reference palette). */
const MANAGER_BG: Record<string, string> = {
  Turner: "#1c1f27",
  Reed: "#363c49",
  Hayes: "#565e6e",
  Price: "#9aa0ad",
};

const DEFAULT_MANAGER_BG = "#1c1f27";

/** Initials from a first/last name: first letters of the first two words (fallback — the first letter). */
function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase());
  const joined = letters.join("");
  return joined.length > 0 ? joined : "—";
}

/** Timeline icon type by activity: call → call, note/event → email, otherwise other. */
function timelineKind(kind: ActivityKind): DrawerTimelineKind {
  if (kind === "call") return "call";
  if (kind === "note" || kind === "task") return "other";
  return "other";
}

/** "Track" pill colors relative to the current stage: past / current / future. */
function trackColors(index: number, current: number): { bg: string; color: string } {
  if (index < current) {
    return { bg: "#e7f5ee", color: "#197a48" };
  }
  if (index === current) {
    return { bg: "var(--accent)", color: "#fff" };
  }
  return { bg: "#efe9e2", color: "#6a5f54" };
}

/**
 * Loads deal-card data for the drawer. RBAC reuses the `getDealWorkspace` owner
 * boundary (a manager → someone else's deal returns null, the drawer won't open).
 * Health comes from the same RBAC-filtered `listDealsWithStatus`, so the Score
 * Pill in the drawer matches the pill on the board. `null` — no access/not found.
 */
export async function getDealDrawerData(dealId: string): Promise<DealDrawerData | null> {
  const viewer = await resolveViewer();
  if (!viewer) {
    return null;
  }
  const container = getContainer();
  const id = makeId<"DealId">(dealId);
  const [workspace, withStatus, allTechRequests] = await Promise.all([
    container.getDealWorkspace(id, viewer),
    container.listDealsWithStatus(viewer),
    container.listAllTechRequests(),
  ]);
  if (!workspace) {
    return null;
  }
  const { deal, timeline, nextStep } = workspace;
  const status = withStatus.find((entry) => entry.deal.id === deal.id);
  const clients = await container.listClients(viewer);
  // Latest tech request for this deal (to show status at the testing stage, item 17 #394).
  const dealTechReqs = allTechRequests.filter((r) => r.dealId === deal.id);
  const latestTechReq = dealTechReqs.length > 0 ? dealTechReqs[dealTechReqs.length - 1] : null;
  const clientName = clients.find((client) => client.id === deal.clientId)?.name ?? "—";

  const managerName = managerLabel(deal.responsibleManagerId);
  // The track comes from the single FUNNEL_TRACK with domain labels — the same
  // stages as on the full deal card (#318). lost isn't in the track → indexOf = -1
  // (all stages are "future").
  const currentTrackIndex = FUNNEL_TRACK.indexOf(deal.stage);
  const track = FUNNEL_TRACK.map((stage, index) => {
    const { bg, color } = trackColors(index, currentTrackIndex);
    return { label: DEAL_STAGE_LABELS[stage], bg, color };
  });

  return {
    id: deal.id,
    title: deal.title,
    stage: deal.stage,
    stageLabel: DEAL_STAGE_LABELS[deal.stage],
    managerName,
    managerInitials: initialsOf(managerName),
    managerBg: MANAGER_BG[managerName] ?? DEFAULT_MANAGER_BG,
    clientId: deal.clientId,
    clientName,
    goalLabel: DEAL_GOAL_LABELS[deal.goal ?? DEFAULT_DEAL_GOAL],
    comment: deal.comment ?? null,
    health: status?.health ?? "neutral",
    outcome: outcomeBadge(deal),
    nextStep: nextStep ? { text: nextStep.text, dueDate: nextStep.dueDate ?? null } : null,
    track,
    timeline: timeline.slice(0, 6).map((item) => ({
      id: item.id,
      kindLabel:
        item.source === "activity"
          ? ACTIVITY_KIND_LABELS[item.activityKind]
          : DEAL_EVENT_TYPE_LABELS[item.eventType],
      kind: item.source === "activity" ? timelineKind(item.activityKind) : "email",
      text: item.text,
      author: personLabel(item.author),
      at: item.at,
    })),
    techRequestStatus:
      deal.stage === "testing" && latestTechReq
        ? { label: TECH_REQUEST_STATUS_LABELS[latestTechReq.status], status: latestTechReq.status }
        : null,
  };
}
