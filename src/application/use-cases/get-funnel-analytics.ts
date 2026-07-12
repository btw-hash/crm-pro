import type { DealRepository } from "@/application/ports/deal-repository";
import { type FunnelAnalytics, summarizeFunnel } from "@/domain/deal/funnel-analytics";

/** Funnel scope: `managerId` → only that manager's deals; otherwise the whole department. */
export interface FunnelScope {
  readonly managerId?: string;
}

export type GetFunnelAnalytics = (scope?: FunnelScope) => Promise<FunnelAnalytics>;

/**
 * Funnel summary: the head of sales sees the whole department (no scope); a
 * Manager sees their personal funnel (`scope.managerId`). Role gating lives
 * at the page/nav level — this is only a data filter.
 */
export function makeGetFunnelAnalytics(deps: { deals: DealRepository }): GetFunnelAnalytics {
  return async (scope) =>
    summarizeFunnel(
      await deps.deals.list(
        scope?.managerId ? { responsibleManagerId: scope.managerId } : undefined,
      ),
    );
}
