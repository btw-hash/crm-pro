import type { UsageReport } from "@/application/ports/usage-report-repository";

/** Human-readable names of AI features for the report (keys — `AiFeature`). */
export const FEATURE_LABELS: Record<string, string> = {
  voice_to_act: "Voice → test act",
  activity_from_voice: "Voice → activity",
  proposal_text: "Proposal text",
  manager_question: "Assistant: CRM answer",
  web_answer: "Assistant: web search answer",
  assistant_plan: "Assistant: step planning",
  next_step: "Next step suggestion",
  client_message: "Client message draft",
  product_describe: "Product description",
};

export function featureLabel(feature: string): string {
  return FEATURE_LABELS[feature] ?? feature;
}

export interface UsageTotals {
  readonly calls: number;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedTokens: number;
  readonly costMinor: number;
}

export interface UsageByFeatureRow extends UsageTotals {
  readonly feature: string;
  readonly label: string;
}

export interface UsageReportView {
  readonly totals: UsageTotals;
  /** Breakdown by feature, descending by cost (biggest spend on top). */
  readonly byFeature: readonly UsageByFeatureRow[];
}

const ZERO: UsageTotals = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  cachedTokens: 0,
  costMinor: 0,
};

function add(a: UsageTotals, b: UsageTotals): UsageTotals {
  return {
    calls: a.calls + b.calls,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cachedTokens: a.cachedTokens + b.cachedTokens,
    costMinor: a.costMinor + b.costMinor,
  };
}

/**
 * Collapses daily buckets (day × feature × model) of the report into overall totals
 * and a breakdown by feature (descending by cost — "what we spend the most on" first).
 * Pure presentation logic — tested separately from the page.
 */
export function buildUsageReportView(report: UsageReport): UsageReportView {
  let totals = ZERO;
  const byFeatureMap = new Map<string, UsageTotals>();
  for (const bucket of report) {
    totals = add(totals, bucket);
    byFeatureMap.set(bucket.feature, add(byFeatureMap.get(bucket.feature) ?? ZERO, bucket));
  }
  const byFeature = [...byFeatureMap.entries()]
    .map(([feature, t]) => ({ feature, label: featureLabel(feature), ...t }))
    .sort((a, b) => b.costMinor - a.costMinor);
  return { totals, byFeature };
}
