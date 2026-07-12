import type {
  OwnerUsageBucket,
  UsageReport,
  UsageReportRepository,
} from "@/application/ports/usage-report-repository";

/** Date range of the report (YYYY-MM-DD, inclusive). */
export interface GetUsageReportInput {
  readonly fromDay: string;
  readonly toDay: string;
}

export type GetUsageReport = (input: GetUsageReportInput) => Promise<UsageReport>;

/**
 * LLM token spend report for a period (#216): daily aggregates by feature/model with
 * cost in cents (deterministic from tokens). RBAC — at the server-action level (like
 * other dashboards): the department-wide report is visible to the head of sales.
 */
export function makeGetUsageReport(deps: { usage: UsageReportRepository }): GetUsageReport {
  return (input) => deps.usage.getReport({ fromDay: input.fromDay, toDay: input.toDay });
}

/** Report row per employee with a human-readable label (#401). */
export interface OwnerUsageRow extends OwnerUsageBucket {
  readonly ownerLabel: string;
}

export type GetUsageOwnerReport = (input: GetUsageReportInput) => Promise<readonly OwnerUsageRow[]>;

/**
 * LLM token spend report by employee for a period (#401): which manager spent how much.
 * ownerId → readable label via `labelOwner`; null (outside a session) → a system row.
 */
export function makeGetUsageOwnerReport(deps: {
  usage: UsageReportRepository;
  labelOwner: (id: string) => string;
}): GetUsageOwnerReport {
  return async (input) => {
    const buckets = await deps.usage.getOwnerReport({ fromDay: input.fromDay, toDay: input.toDay });
    return buckets.map((b) => ({
      ...b,
      ownerLabel: b.ownerId ? deps.labelOwner(b.ownerId) : "System / outside session",
    }));
  };
}
