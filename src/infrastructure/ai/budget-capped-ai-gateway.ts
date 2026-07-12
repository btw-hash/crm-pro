import type {
  ActivityDraft,
  AiGateway,
  AssistantDecision,
  AssistantStepInput,
  CrmSnapshot,
  DealMessageContext,
  NextStepContext,
  ProposalFacts,
  TestActDraft,
} from "@/application/ports/ai-gateway";
import type { WebSearchResult } from "@/application/ports/web-search-gateway";
import type { Logger } from "@/infrastructure/logging/logger";

/** Prefixed onto the user-visible text once the daily budget is spent, so a suddenly
 * canned-looking answer doesn't read as a bug. */
const BUDGET_EXHAUSTED_NOTE =
  "[Demo AI budget exhausted for today -- showing a placeholder instead of calling the " +
  "model. Try again tomorrow.] ";

export interface BudgetCappedAiGatewayOptions {
  /** The real gateway, used while under budget. */
  readonly live: AiGateway;
  /** Fallback once the daily budget is spent -- deterministic, same as AI_MODE=stub. */
  readonly stub: AiGateway;
  /** Max number of `live` calls per UTC day. */
  readonly dailyLimit: number;
  /** Clock -- injectable for deterministic tests. */
  readonly now?: () => Date;
  readonly logger?: Logger;
}

/**
 * AiGateway decorator: caps how many calls reach the real (paid) `live` gateway per UTC
 * day. Once the cap is spent, every call for the rest of the day is served by `stub`
 * instead -- same deterministic behavior as `AI_MODE=stub`, with an honest note
 * prefixed onto the user-visible text so it's clear the answer is a placeholder, not a
 * bug. The counter is in-memory only (per process; resets on redeploy) -- adequate for
 * a public-demo budget, not a billing-grade rate limiter.
 */
export class BudgetCappedAiGateway implements AiGateway {
  private readonly callsByDay = new Map<string, number>();

  constructor(private readonly options: BudgetCappedAiGatewayOptions) {}

  private dayKey(): string {
    return (this.options.now?.() ?? new Date()).toISOString().slice(0, 10);
  }

  /** Consumes one call from today's budget if available; reports whether it was live. */
  private route(): { impl: AiGateway; isLive: boolean } {
    const day = this.dayKey();
    const used = this.callsByDay.get(day) ?? 0;
    const isLive = used < this.options.dailyLimit;
    if (isLive) {
      this.callsByDay.set(day, used + 1);
    } else {
      this.options.logger?.warn("ai.budget_exhausted", { dailyLimit: this.options.dailyLimit });
    }
    return { impl: isLive ? this.options.live : this.options.stub, isLive };
  }

  async parseVoiceToActDraft(input: { transcript: string }): Promise<TestActDraft> {
    const { impl, isLive } = this.route();
    const draft = await impl.parseVoiceToActDraft(input);
    return isLive ? draft : { ...draft, comment: BUDGET_EXHAUSTED_NOTE + (draft.comment ?? "") };
  }

  async draftActivityFromVoice(input: { transcript: string }): Promise<ActivityDraft> {
    const { impl, isLive } = this.route();
    const draft = await impl.draftActivityFromVoice(input);
    return isLive ? draft : { ...draft, text: BUDGET_EXHAUSTED_NOTE + draft.text };
  }

  async draftProposalText(facts: ProposalFacts): Promise<string> {
    const { impl, isLive } = this.route();
    const text = await impl.draftProposalText(facts);
    return isLive ? text : BUDGET_EXHAUSTED_NOTE + text;
  }

  async answerManagerQuestion(input: {
    question: string;
    snapshot: CrmSnapshot;
  }): Promise<{ answer: string }> {
    const { impl, isLive } = this.route();
    const { answer } = await impl.answerManagerQuestion(input);
    return { answer: isLive ? answer : BUDGET_EXHAUSTED_NOTE + answer };
  }

  async answerFromWebSearch(input: {
    question: string;
    results: readonly WebSearchResult[];
  }): Promise<{ answer: string }> {
    const { impl, isLive } = this.route();
    const { answer } = await impl.answerFromWebSearch(input);
    return { answer: isLive ? answer : BUDGET_EXHAUSTED_NOTE + answer };
  }

  async planAssistantStep(input: AssistantStepInput): Promise<AssistantDecision> {
    const { impl, isLive } = this.route();
    const decision = await impl.planAssistantStep(input);
    if (isLive || decision.kind !== "answer") {
      return decision;
    }
    return { kind: "answer", text: BUDGET_EXHAUSTED_NOTE + decision.text };
  }

  async suggestNextStep(context: NextStepContext): Promise<{ suggestion: string }> {
    const { impl, isLive } = this.route();
    const { suggestion } = await impl.suggestNextStep(context);
    return { suggestion: isLive ? suggestion : BUDGET_EXHAUSTED_NOTE + suggestion };
  }

  async draftClientMessage(input: {
    context: DealMessageContext;
    intent: string | null;
  }): Promise<{ subject: string; body: string }> {
    const { impl, isLive } = this.route();
    const draft = await impl.draftClientMessage(input);
    return isLive ? draft : { ...draft, body: BUDGET_EXHAUSTED_NOTE + draft.body };
  }

  async describeProduct(input: {
    name: string;
    category: string;
    benefits: readonly string[];
  }): Promise<{ text: string; sourceUrl: string | null }> {
    const { impl, isLive } = this.route();
    const draft = await impl.describeProduct(input);
    return isLive ? draft : { ...draft, text: BUDGET_EXHAUSTED_NOTE + draft.text };
  }
}
