import type { Id } from "@/domain/shared/id";

export type DeficitRequestId = Id<"DeficitRequestId">;

/**
 * Client status affects priority during a deficit.
 * A — strategic, B — growing, C — one-off.
 */
export type ClientCategory = "A" | "B" | "C";

/**
 * Need type: how critical the supply is for the client.
 * production_stop — production will halt; scheduled — a planned order; trial — a trial batch.
 */
export type NeedType = "production_stop" | "scheduled" | "trial";

export interface DeficitRequestInput {
  readonly requestId: DeficitRequestId;
  readonly clientStatus: ClientCategory;
  readonly needType: NeedType;
  /** Remaining shelf life of the client's stock, in days (0 = running out). */
  readonly shelfLifeDays: number;
  /** Margin on this client/product, in percent (0-100). */
  readonly marginPercent: number;
  /** Requested volume in natural units. */
  readonly requestedQty: number;
}

export interface Allocation {
  readonly requestId: DeficitRequestId;
  readonly score: number;
  readonly requestedQty: number;
  readonly allocatedQty: number;
}

/**
 * Scores a request on a 100-point scale.
 *
 * Weights:
 *   - Client status (40 points): A=40, B=25, C=10
 *   - Need type (30 points): production_stop=30, scheduled=18, trial=6
 *   - Shelf life (20 points): normalized over a 0-30 day window (fewer days = higher score)
 *   - Margin (10 points): normalized over 0-100%
 */
export function scoreRequest(
  input: Pick<DeficitRequestInput, "clientStatus" | "needType" | "shelfLifeDays" | "marginPercent">,
): number {
  const statusScore: Record<ClientCategory, number> = { A: 40, B: 25, C: 10 };
  const needScore: Record<NeedType, number> = {
    production_stop: 30,
    scheduled: 18,
    trial: 6,
  };

  const shelfDayCapped = Math.min(Math.max(input.shelfLifeDays, 0), 30);
  const shelfScore = Math.round(((30 - shelfDayCapped) / 30) * 20);

  const marginCapped = Math.min(Math.max(input.marginPercent, 0), 100);
  const marginScore = Math.round((marginCapped / 100) * 10);

  return statusScore[input.clientStatus] + needScore[input.needType] + shelfScore + marginScore;
}

/**
 * Greedily allocates the available stock across requests.
 * Sorts by descending score; allocates each request min(requested, remaining).
 */
export function allocateDeficit(
  requests: readonly DeficitRequestInput[],
  availableQty: number,
): Allocation[] {
  const scored = requests.map((r) => ({
    ...r,
    score: scoreRequest(r),
  }));

  scored.sort((a, b) => b.score - a.score);

  let remaining = Math.max(availableQty, 0);
  return scored.map((r) => {
    const allocatedQty = Math.min(r.requestedQty, remaining);
    remaining -= allocatedQty;
    return {
      requestId: r.requestId,
      score: r.score,
      requestedQty: r.requestedQty,
      allocatedQty,
    };
  });
}
