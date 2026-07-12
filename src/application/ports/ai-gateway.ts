import type { ActivityKind } from "@/domain/activity/activity";
import type { TestActResult } from "@/domain/test-act/test-act";
import type { WebSearchResult } from "@/application/ports/web-search-gateway";

export type { TestActResult };

/**
 * Draft activity generated from a voice summary of a call/meeting OR a dictated task.
 * The AI extracts the kind, the gist, and (if present) the next step. The next step's
 * due date is computed by DETERMINISTIC code from what was said ("tomorrow", "on
 * Friday") — not by the LLM, so the date isn't invented; the human confirms it in the form.
 */
export interface ActivityDraft {
  /** Activity kind: call/visit/note (a task is a separate next step). */
  readonly kind: ActivityKind;
  readonly text: string;
  readonly nextStepText: string | null;
  /**
   * Due date of the next step in ISO "YYYY-MM-DD", if the transcript names a future
   * day ("tomorrow", "in a week", "July 5th"); otherwise null. Computed by code
   * relative to the current date (see `resolveRelativeDueDate`). Time of day is not
   * included here — it stays in `nextStepText`.
   */
  readonly nextStepDueDate: string | null;
}

/** Draft "Test act" extracted by the AI from a transcribed voice report. */
export interface TestActDraft {
  readonly clientName: string | null;
  readonly equipment: string | null;
  readonly productName: string | null;
  readonly dosage: string | null;
  readonly processParams: string | null;
  readonly result: TestActResult;
  readonly comment: string | null;
  /** Fields the AI could not extract — the user fills them in manually. */
  readonly missingFields: readonly string[];
}

/**
 * Facts for the proposal's cover text. All numbers are already computed
 * deterministically — the AI only turns them into prose, it doesn't invent them.
 */
export interface ProposalFacts {
  readonly clientName: string;
  readonly productName: string;
  /** Ready-made monthly savings string (e.g. "$1,344.00"). */
  readonly savingsPerMonth: string;
  readonly defectReductionPercent: number;
}

/** A deal in the CRM snapshot for the assistant (values are already computed deterministically). */
export interface SnapshotDeal {
  readonly title: string;
  readonly clientName: string;
  readonly managerName: string;
  readonly stage: string;
  readonly goal: string;
  /** "Stalled" — an active stage with no planned next step. */
  readonly stalled: boolean;
}

/** A client with a financial balance (receivables/limit) — amounts are already formatted. */
export interface SnapshotClientDebt {
  readonly clientName: string;
  readonly managerName: string;
  readonly category: string;
  readonly debt: string;
  readonly creditLimit: string;
  readonly overLimit: boolean;
}

/** Summary for a manager — all counters are deterministic. */
export interface SnapshotManager {
  readonly managerName: string;
  readonly activeDeals: number;
  readonly stalledDeals: number;
  readonly openTasks: number;
}

/** A pipeline distribution bucket (stage/goal label + count). */
export interface FunnelBucket {
  readonly label: string;
  readonly count: number;
}

/** Pipeline summary for the assistant (all numbers computed by code — `summarizeFunnel`). */
export interface SnapshotFunnel {
  readonly total: number;
  readonly active: number;
  readonly won: number;
  readonly lost: number;
  readonly winRatePercent: number;
  readonly byStage: readonly FunnelBucket[];
  readonly byGoal: readonly FunnelBucket[];
}

/** A deal with a requested sample whose test act hasn't been drawn up yet (awaiting the test). */
export interface SnapshotPendingTest {
  readonly dealTitle: string;
  readonly clientName: string;
  readonly technologistName: string;
}

/**
 * Deterministic snapshot of the CRM for the sales-head assistant's answers. All
 * numbers are computed by code (not the AI) — the model only finds and phrases the
 * answer, without inventing anything.
 */
export interface CrmSnapshot {
  readonly deals: readonly SnapshotDeal[];
  readonly clientsWithDebt: readonly SnapshotClientDebt[];
  readonly managers: readonly SnapshotManager[];
  readonly funnel: SnapshotFunnel;
  readonly pendingTests: readonly SnapshotPendingTest[];
}

/**
 * Tools for the assistant's tool-using agent. `query_crm` — a snapshot of OUR data
 * (deals/clients/managers/debts/pipeline); `search_web` — search on the EXTERNAL
 * internet (suppliers, market, new companies).
 */
export type AssistantTool = "query_crm" | "search_web";

/**
 * One already-executed step of the ReAct agent: which tool was called, with what
 * query (for web search), and its text result — this is the "memory" for the
 * AI's next decision.
 */
export interface AssistantStepRecord {
  readonly tool: AssistantTool;
  /** Search query for search_web (unused for query_crm). */
  readonly query?: string;
  /** Text result of the step (rendered CRM snapshot or web search results). */
  readonly result: string;
}

/**
 * The ReAct agent's decision at the current step: either call a tool, or give a
 * final answer. Discriminated union on the `kind` field.
 */
export type AssistantDecision =
  | { readonly kind: "tool"; readonly tool: AssistantTool; readonly query?: string }
  | { readonly kind: "answer"; readonly text: string };

/**
 * A turn from the assistant's previous conversation (for follow-ups): whose turn and
 * the text. Passed to the planner so that questions like "any links?" / "more
 * options?" are interpreted in the context of the past exchange rather than as a
 * new, isolated request.
 */
export interface AssistantConversationTurn {
  readonly role: "user" | "assistant";
  readonly text: string;
}

/** Input to the agent's step planner: the original question + history of results gathered so far. */
export interface AssistantStepInput {
  readonly question: string;
  readonly history: readonly AssistantStepRecord[];
  /**
   * Previous turns of this conversation (chronological, oldest first) — context for
   * follow-ups. Optional: absent for the first question in a conversation.
   */
  readonly conversation?: readonly AssistantConversationTurn[];
}

/** Deal context for the AI "next step" advisor (everything is deterministic facts from the CRM). */
export interface NextStepContext {
  readonly dealTitle: string;
  readonly clientName: string;
  readonly stage: string;
  readonly goal: string;
  /** Recent activities for the deal (texts), newest first — so the AI accounts for history. */
  readonly recentActivities: readonly string[];
}

/** Deal context for a draft message to the client (deterministic facts from the CRM). */
export interface DealMessageContext {
  readonly clientName: string;
  readonly dealTitle: string;
  readonly stage: string;
  readonly goal: string;
  /** Name of the sending manager (for the signature). */
  readonly managerName: string;
  readonly recentActivities: readonly string[];
}

/**
 * Boundary with the AI layer. Input is a transcript (STT is separate).
 * Rule: the AI extracts and phrases; numbers/facts are confirmed by a human.
 */
export interface AiGateway {
  parseVoiceToActDraft(input: { transcript: string }): Promise<TestActDraft>;
  /** Activity draft (call/meeting) from a transcript: kind, gist, next step. */
  draftActivityFromVoice(input: { transcript: string }): Promise<ActivityDraft>;
  /** Proposal cover text from ready-made facts. */
  draftProposalText(facts: ProposalFacts): Promise<string>;
  /**
   * Answer to the sales head's question based on a deterministic CRM snapshot. The
   * model answers ONLY from the snapshot, taking its numbers from it and never
   * inventing any.
   */
  answerManagerQuestion(input: { question: string; snapshot: CrmSnapshot }): Promise<{
    answer: string;
  }>;
  /**
   * Analysis of web search results in our business context (food ingredient
   * distribution). Instead of a raw list of links, the AI gives a USEFUL answer:
   * what's relevant to US and why, what to check next. Relies ONLY on the snippets
   * (doesn't invent numbers/facts), ends with sources (URLs).
   */
  answerFromWebSearch(input: {
    question: string;
    results: readonly WebSearchResult[];
  }): Promise<{ answer: string }>;
  /**
   * A step of the assistant's ReAct agent: given the question and the history of
   * results gathered so far, the AI decides the next step itself — call a tool
   * (`query_crm`/`search_web`) OR give a final answer. Replaces brittle regex-based
   * "CRM vs web" routing: the AI can combine tools (web first, then CRM) and then
   * answer. The implementation is resilient — on an invalid model output it returns
   * a safe final answer instead of failing.
   */
  planAssistantStep(input: AssistantStepInput): Promise<AssistantDecision>;
  /**
   * Suggests one concrete next step for a stalled deal (based on stage and history).
   * An action text; doesn't invent facts/numbers; a human edits and confirms it.
   */
  suggestNextStep(context: NextStepContext): Promise<{ suggestion: string }>;
  /**
   * Draft follow-up message to the client (subject + body) from the deal context.
   * Facts come from the context, the AI doesn't invent prices or agreements; a human
   * edits and sends it themselves.
   */
  draftClientMessage(input: {
    context: DealMessageContext;
    intent: string | null;
  }): Promise<{ subject: string; body: string }>;
  /**
   * Reference description of a product for the catalog (batch, prepared in advance —
   * NOT realtime). Non-sensitive data (name/category/benefits) → allowed via the
   * global-scope model. Marked "found by AI" and confirmed by a human; `sourceUrl`
   * is the presumed official site (verified by a human).
   */
  describeProduct(input: {
    name: string;
    category: string;
    benefits: readonly string[];
  }): Promise<{ text: string; sourceUrl: string | null }>;
}
