import type { Deal } from "./deal";
import { DEAL_GOALS, DEFAULT_DEAL_GOAL, type DealGoal } from "./deal-goal";
import { DEAL_STAGES, type DealStage, isTerminal } from "./deal-stage";

export interface FunnelStageStat {
  readonly stage: DealStage;
  readonly count: number;
}

export interface FunnelGoalStat {
  readonly goal: DealGoal;
  readonly count: number;
}

/** Funnel summary for the head of sales: distribution and totals across deals. */
export interface FunnelAnalytics {
  readonly total: number;
  /** Deals in active (non-terminal) stages. */
  readonly active: number;
  /** Completed deals with outcome=won. */
  readonly won: number;
  /** Completed deals with outcome=lost. */
  readonly lost: number;
  /** Share of wins among completed deals with a known outcome: won / (won + lost). 0 if none. */
  readonly winRate: number;
  readonly byStage: readonly FunnelStageStat[];
  readonly byGoal: readonly FunnelGoalStat[];
}

/** Aggregates a list of deals into a funnel summary. Pure function, no side effects. */
export function summarizeFunnel(deals: readonly Deal[]): FunnelAnalytics {
  const byStage = DEAL_STAGES.map((stage) => ({
    stage,
    count: deals.filter((deal) => deal.stage === stage).length,
  }));
  const byGoal = DEAL_GOALS.map((goal) => ({
    goal,
    count: deals.filter((deal) => (deal.goal ?? DEFAULT_DEAL_GOAL) === goal).length,
  }));
  const won = deals.filter((deal) => deal.outcome === "won").length;
  const lost = deals.filter((deal) => deal.outcome === "lost").length;
  const closed = won + lost;
  return {
    total: deals.length,
    active: deals.filter((deal) => !isTerminal(deal.stage)).length,
    won,
    lost,
    winRate: closed === 0 ? 0 : won / closed,
    byStage,
    byGoal,
  };
}
