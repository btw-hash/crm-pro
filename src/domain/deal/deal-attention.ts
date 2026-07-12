import { type Activity, nextStep } from "@/domain/activity/activity";
import type { DealEvent } from "@/domain/deal-event/deal-event";
import type { Deal } from "./deal";
import { isTerminal } from "./deal-stage";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Threshold for "stuck too long" — days on a single stage (a discipline signal). */
export const STALE_STAGE_DAYS = 14;

/**
 * A deal is "stuck": it's on an active stage (not "Won"/"Lost"), but has no
 * planned next step — an open task (see `nextStep`). This is a signal of a
 * commercial-discipline violation: such a deal is easy to lose. Terminal deals
 * don't require a next step.
 */
export function dealNeedsNextStep(deal: Deal, activities: readonly Activity[]): boolean {
  return !isTerminal(deal.stage) && nextStep(activities) === null;
}

/**
 * How many days the deal has been on its current stage — from the latest
 * stage-change event (`stage_changed`/`stage_reverted`) to `now`. `null` if there
 * have been no transitions yet (no reference point). Pure function: `now` is
 * passed in (deterministic/testable).
 */
export function daysOnStage(events: readonly DealEvent[], now: string): number | null {
  let latest: string | null = null;
  for (const event of events) {
    if (event.type === "stage_changed" || event.type === "stage_reverted") {
      if (latest === null || event.createdAt > latest) {
        latest = event.createdAt;
      }
    }
  }
  if (latest === null) {
    return null;
  }
  const ms = Date.parse(now) - Date.parse(latest);
  if (!Number.isFinite(ms) || ms < 0) {
    return null;
  }
  return Math.floor(ms / MS_PER_DAY);
}

/**
 * The deal is "stuck" on its stage for too long (≥ `STALE_STAGE_DAYS`) and is not
 * terminal — a commercial-discipline signal (complements the "no next step" flag).
 */
export function isStaleOnStage(deal: Deal, days: number | null): boolean {
  return !isTerminal(deal.stage) && days !== null && days >= STALE_STAGE_DAYS;
}

/** Soft threshold for "time to act" — days on stage before the "attention" signal. */
export const ATTENTION_STAGE_DAYS = 7;

/**
 * Deal health as a single signal for the board (combines "no next step" and
 * "how long it's been stuck on stage"):
 * - `healthy` — active, has a next step, on stage < attention threshold;
 * - `attention` — no next step OR lingering (≥ `ATTENTION_STAGE_DAYS`);
 * - `critical` — stuck ≥ `STALE_STAGE_DAYS` OR no next step AND already lingering;
 * - `neutral` — terminal (won/lost), no signal needed.
 */
export type DealHealth = "healthy" | "attention" | "critical" | "neutral";

export function dealHealth(deal: Deal, needsNextStep: boolean, days: number | null): DealHealth {
  if (isTerminal(deal.stage)) {
    return "neutral";
  }
  const lingering = days !== null && days >= ATTENTION_STAGE_DAYS;
  if (isStaleOnStage(deal, days) || (needsNextStep && lingering)) {
    return "critical";
  }
  if (needsNextStep || lingering) {
    return "attention";
  }
  return "healthy";
}

export const DEAL_HEALTH_LABELS: Record<DealHealth, string> = {
  healthy: "In progress: has a next step, on track",
  attention: "Needs attention: no next step, or lingering on stage",
  critical: `Critical: stuck ≥${STALE_STAGE_DAYS} days, or long overdue for a next step`,
  neutral: "Deal is closed",
};
