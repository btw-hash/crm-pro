import type {
  ActivityDraft,
  AiGateway,
  AssistantConversationTurn,
  AssistantDecision,
  AssistantStepInput,
  AssistantStepRecord,
  CrmSnapshot,
  DealMessageContext,
  NextStepContext,
  ProposalFacts,
  TestActDraft,
} from "@/application/ports/ai-gateway";
import type { WebSearchResult } from "@/application/ports/web-search-gateway";
import type { ActivityKind } from "@/domain/activity/activity";
import type { TestActResult } from "@/domain/test-act/test-act";
import { missingActFields } from "./missing-act-fields";
import { resolveRelativeDueDate } from "./relative-date";
import type { JsonSchema, LlmProvider } from "./llm/llm-provider";
import type { LlmFeatureScope } from "@/application/ports/llm-feature-scope";
import type { AiFeature } from "@/domain/ai/llm-usage";

const ACT_TOOL = "record_test_act_draft";

const ACT_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    clientName: { type: ["string", "null"], description: "Client/factory, as heard" },
    equipment: { type: ["string", "null"], description: "Equipment (oven, dough mixer, etc.)" },
    productName: { type: ["string", "null"], description: "The product/ingredient under test" },
    dosage: { type: ["string", "null"], description: 'Dosage, e.g. "12%"' },
    processParams: {
      type: ["string", "null"],
      description: "Process parameters: temperature, knead/bake time",
    },
    result: {
      type: "string",
      enum: ["success", "failure", "unknown"],
      description: "Test outcome",
    },
    comment: { type: ["string", "null"], description: "The technologist's comment" },
  },
  required: [
    "clientName",
    "equipment",
    "productName",
    "dosage",
    "processParams",
    "result",
    "comment",
  ],
  additionalProperties: false,
};

const ACT_SYSTEM = [
  "You are a technologist's assistant at a B2B food-ingredient distributor.",
  "The input is a transcript of a voice report after a product test at a client's production site.",
  "Break the facts down into the tool's fields. Map professional slang to canonical",
  "names where it's obvious. IMPORTANT: only take what was actually said — NEVER",
  "invent anything (numbers, dosages, temperatures — only from the text). If a field",
  "isn't there, set it to null.",
  "result: success — the test went well; failure — it didn't; unknown — unclear. A human confirms the outcome.",
].join(" ");

const ACTIVITY_TOOL = "record_activity_draft";

const ACTIVITY_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["call", "visit", "note"],
      description: "Kind: call — a phone call, visit — a meeting/visit, note — a note",
    },
    text: {
      type: "string",
      description: "A short summary of the gist (1-3 sentences) of what was said",
    },
    nextStepText: {
      type: ["string", "null"],
      description:
        'The next step — what to do (e.g. "Call Marina"), if there is one; otherwise null. ' +
        'If a TIME of day is named, put it in the text ("Call Marina at 5 pm"). ' +
        "Do NOT put the DAY/DATE in the text — the system fills that in separately.",
    },
  },
  required: ["kind", "text", "nextStepText"],
  additionalProperties: false,
};

const ACTIVITY_SYSTEM = [
  "You are a sales manager's assistant at a B2B food-ingredient distributor.",
  "The input is a voice transcript. It may be a summary of a call/meeting that ALREADY",
  'happened, OR a dictated FUTURE reminder task ("tomorrow call Marina at 5"). Break it down:',
  '- kind — the kind, by the nature of the action: call/phoning/"call"/"call back"/"dial" -> call;',
  'meeting/visit/"stop by"/"meet up"/negotiation -> visit; otherwise note.',
  "- text — a short gist (1-2 phrases), no filler.",
  "- nextStepText — the concrete next step (what to do), if there is one; otherwise null.",
  "Take ONLY what was actually said — never invent anything (names, numbers, agreements).",
  "Don't include the DAY/DATE of the next step (the system fills that in deterministically);",
  "if a time of day is named, put it in the step's text.",
].join(" ");

const MESSAGE_TOOL = "draft_client_message";

const MESSAGE_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    subject: { type: "string", description: "The email subject — short and to the point" },
    body: {
      type: "string",
      description:
        "The email body: a polite, professional business tone. Greeting, the gist/reason, a concrete call to action, signed by the manager.",
    },
  },
  required: ["subject", "body"],
  additionalProperties: false,
};

const MESSAGE_SYSTEM = [
  "You are a sales manager at a B2B food-ingredient distributor. Draft a follow-up",
  "email to the client in English, in a polite, professional business tone. Use ONLY",
  "facts from the context — do NOT invent prices, discounts, dates, agreements, or",
  "attributes that aren't there. Body structure: greeting, a brief gist/reason (based",
  "on the stage and history), a concrete next step/call to action, signed by the",
  "manager. If an intent is given, follow it. 3-6 sentences.",
].join(" ");

const NEXT_STEP_SYSTEM = [
  "You are an experienced B2B food-ingredient sales coach. Given the context of a",
  "stalled deal (no planned next step), suggest ONE concrete next step — an action",
  "for the manager that will move the deal forward from its current stage. One or two",
  'sentences, in English, in the imperative mood (e.g. "Call the decision maker and…").',
  "Base it on the stage and history; do NOT invent facts, names, numbers, or",
  "agreements that aren't in the context.",
].join(" ");

const PRODUCT_DESCRIBE_SYSTEM = [
  "You are a technologist-copywriter for food ingredients. From a name/category/set of",
  "benefits, write a brief (2-3 sentence) reference description of the product for a",
  "B2B distributor's catalog, in English. Describe its purpose and use; don't invent",
  "exact numbers/standards/composition that aren't in the input. A human will review",
  'this description afterward (it\'s marked "found by AI").',
].join(" ");

const ASSISTANT_SYSTEM = [
  "You are an analytical assistant to the Head of Sales at a B2B food-ingredient",
  "distributor. Answer in English, briefly and to the point, based ONLY on the CRM",
  "snapshot below. NEVER invent anything: take every number, name, amount, and status",
  "strictly from the snapshot. If the snapshot doesn't have the data to answer, say so",
  "directly instead of guessing.",
  "State which deals/clients/managers you're basing the answer on (cite your source).",
].join(" ");

const WEB_SEARCH_SYSTEM = [
  "You are an assistant to the head of Millbrook Foods, a B2B food-ingredient",
  "distributor. A manager asked a question, and you're given web-search results",
  "(title/snippet/link). Give a brief, USEFUL answer: which of the results are",
  "relevant to US (ingredient distribution) and why, and what's worth checking next.",
  "Rely ONLY on what was found — don't invent anything (take numbers, facts, and",
  "names from the snippets). End with a list of sources (URLs). In English, 3-6 sentences.",
].join(" ");

const PROPOSAL_SYSTEM = [
  "You're writing the cover text of a proposal for a B2B client in English, in a",
  "business tone. All the numbers are already computed and given to you — use them",
  "EXACTLY as given and do NOT invent any other figures, prices, or percentages. 3-5",
  "sentences: thank them for the joint test, confirm the product works for their",
  "process, propose agreeing on the first shipment and a delivery schedule. Do NOT",
  "mention the client's economics (defect-rate reduction, monthly savings).",
].join(" ");

const ASSISTANT_PLAN_TOOL = "decide_next_step";

// The agent's decision schema: a discriminated union on `kind`. extractJson doesn't
// support oneOf branching, so the schema is flat: kind is required, the rest are
// optional and validated when parsed (`coerceDecision`). tool/query only apply to kind="tool".
const ASSISTANT_PLAN_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    kind: {
      type: "string",
      enum: ["tool", "answer"],
      description: "tool — call a tool; answer — give the final answer",
    },
    tool: {
      type: ["string", "null"],
      enum: ["query_crm", "search_web", null],
      description: "Only for kind=tool: which tool to call",
    },
    query: {
      type: ["string", "null"],
      description:
        "Only for tool=search_web: a CLEAN public search query (no client names, phone numbers, internal data)",
    },
    text: {
      type: ["string", "null"],
      description: "Only for kind=answer: the final answer to the head of sales, in English",
    },
  },
  required: ["kind"],
  additionalProperties: false,
};

const ASSISTANT_PLAN_SYSTEM = [
  "You are a business assistant to the head of sales at Millbrook Foods.",
  "",
  "=== WHO WE ARE AND WHO OUR CLIENTS ARE (know this firmly) ===",
  "Millbrook Foods is a B2B distributor of FOOD INGREDIENTS (we SELL ingredients, not baked goods).",
  "OUR CLIENTS are FOOD PRODUCERS who BUY ingredients from us:",
  "bakeries, confectioneries, bakery plants, confectionery factories, cafes/restaurants/",
  "foodservice, institutional catering. This is B2B: our buyers are businesses, NOT",
  "end consumers of baked goods.",
  'When the head of sales asks to "find clients / bakeries / confectioners /',
  'restaurants on the market", they mean finding such producer companies WE COULD SELL',
  "ingredients TO (leads/prospective clients). Do NOT look for end consumers of baked",
  'goods and do NOT give marketing advice to bakeries themselves. "Find suppliers"',
  "means suppliers of raw materials/ingredients FOR us (import/wholesale), not for the client.",
  "",
  "=== TOOLS ===",
  "query_crm — a snapshot of OUR data (deals/clients/managers/receivables/pipeline);",
  "search_web — search on the EXTERNAL internet (prospective producer clients,",
  "raw-material suppliers, market, prices, industry news).",
  "Given the head of sales's question and the history of results gathered so far,",
  "decide the NEXT step. query_crm — for questions about our data; search_web — for",
  "external information; you can call both in sequence and only then answer. When",
  "enough data has been gathered, return {kind:'answer', text}. For search_web give a",
  'CLEAN, SPECIFIC public search query (e.g. "wholesale bakeries Denver bread',
  "production\") — WITHOUT our clients' names, phone numbers, or internal data.",
  "",
  "=== STYLE OF THE FINAL ANSWER (this is a business assistant) ===",
  "Brief, to the point, businesslike, in English. No filler or generic advice.",
  'For web results — name SPECIFIC companies found: "Name — one short line on why',
  "it's relevant as a prospective client (what they make, their scale)\". If suitable",
  "leads were found, list them; if not, say so honestly. Do NOT put raw URLs in the",
  "answer text (the UI shows source links separately) — the text should only have",
  "names and gist. Never invent numbers, names, or facts — take them only from the",
  "history of tool results.",
].join("\n");

/**
 * Live implementation of the AI gateway on top of the abstract `LlmProvider`
 * (Claude/OpenAI). Follows the project rule: the AI extracts/drafts, numbers are
 * deterministic and supplied externally, a human confirms the result.
 */
export class LlmAiGateway implements AiGateway {
  constructor(
    private readonly provider: LlmProvider,
    /** Per-request feature tag for token accounting (#216). Optional: without it, the wrappers are a no-op. */
    private readonly featureScope?: LlmFeatureScope,
  ) {}

  /** Runs an AI call under a feature tag (if a scope is set) so the decorator can track spend. */
  private withFeature<T>(feature: AiFeature, fn: () => Promise<T>): Promise<T> {
    return this.featureScope ? this.featureScope.run(feature, fn) : fn();
  }

  async parseVoiceToActDraft(input: { transcript: string }): Promise<TestActDraft> {
    const raw = await this.withFeature("voice_to_act", () =>
      this.provider.extractJson({
        system: ACT_SYSTEM,
        user: input.transcript,
        toolName: ACT_TOOL,
        toolDescription: 'Draft "Test act" from a technologist\'s voice report',
        schema: ACT_SCHEMA,
      }),
    );
    const draft = coerceDraft(raw);
    return { ...draft, missingFields: missingActFields(draft) };
  }

  async draftActivityFromVoice(input: { transcript: string }): Promise<ActivityDraft> {
    const raw = await this.withFeature("activity_from_voice", () =>
      this.provider.extractJson({
        system: ACTIVITY_SYSTEM,
        user: input.transcript,
        toolName: ACTIVITY_TOOL,
        toolDescription: "Activity draft from a spoken summary of a call/meeting or a task",
        schema: ACTIVITY_SCHEMA,
      }),
    );
    const coerced = coerceActivityDraft(raw);
    // The next step's due date is computed by DETERMINISTIC code (not the LLM):
    // "tomorrow"/"on Friday" -> an ISO day relative to today. Only meaningful when
    // there's a next step at all.
    const nextStepDueDate = coerced.nextStepText
      ? resolveRelativeDueDate(input.transcript, new Date())
      : null;
    return { ...coerced, nextStepDueDate };
  }

  async draftProposalText(facts: ProposalFacts): Promise<string> {
    return this.withFeature("proposal_text", () =>
      this.provider.completeText({
        system: PROPOSAL_SYSTEM,
        // The client's economics (defect-rate reduction / monthly savings) are NOT
        // passed into the letter — #462 §4.5 hides it in the presentation layer.
        user: [`Client: ${facts.clientName}`, `Product: ${facts.productName}`].join("\n"),
      }),
    );
  }

  async answerManagerQuestion(input: {
    question: string;
    snapshot: CrmSnapshot;
  }): Promise<{ answer: string }> {
    const answer = await this.withFeature("manager_question", () =>
      this.provider.completeText({
        system: ASSISTANT_SYSTEM,
        user: `Head of sales's question: ${input.question}\n\n=== CRM SNAPSHOT ===\n${renderSnapshot(input.snapshot)}`,
        maxTokens: 800,
      }),
    );
    return { answer };
  }

  async answerFromWebSearch(input: {
    question: string;
    results: readonly WebSearchResult[];
  }): Promise<{ answer: string }> {
    const answer = await this.withFeature("web_answer", () =>
      this.provider.completeText({
        system: WEB_SEARCH_SYSTEM,
        user: `Manager's question: ${input.question}\n\n=== WEB SEARCH RESULTS ===\n${renderWebResults(input.results)}`,
        maxTokens: 800,
      }),
    );
    return { answer: answer.trim() };
  }

  async planAssistantStep(input: AssistantStepInput): Promise<AssistantDecision> {
    // Context from the previous conversation (if any) — placed before the current
    // question, so follow-ups ("any links?", "more options?") are interpreted
    // relative to the previous exchange.
    const conversationBlock =
      input.conversation && input.conversation.length > 0
        ? `=== PREVIOUS CONVERSATION ===\n${renderConversation(input.conversation)}\n\n`
        : "";
    const raw = await this.withFeature("assistant_plan", () =>
      this.provider.extractJson({
        system: ASSISTANT_PLAN_SYSTEM,
        user: `${conversationBlock}The head of sales's current question: ${input.question}\n\n=== HISTORY OF RESULTS GATHERED SO FAR ===\n${renderStepHistory(input.history)}`,
        toolName: ASSISTANT_PLAN_TOOL,
        toolDescription:
          "The agent's decision: call a tool (query_crm/search_web) or give an answer",
        schema: ASSISTANT_PLAN_SCHEMA,
      }),
    );
    return coerceDecision(raw);
  }

  async suggestNextStep(context: NextStepContext): Promise<{ suggestion: string }> {
    const suggestion = await this.withFeature("next_step", () =>
      this.provider.completeText({
        system: NEXT_STEP_SYSTEM,
        user: renderNextStepContext(context),
        maxTokens: 200,
      }),
    );
    return { suggestion: suggestion.trim() };
  }

  async draftClientMessage(input: {
    context: DealMessageContext;
    intent: string | null;
  }): Promise<{ subject: string; body: string }> {
    const c = input.context;
    const history = c.recentActivities.length
      ? c.recentActivities.map((text) => `- ${text}`).join("\n")
      : "none";
    const raw = await this.withFeature("client_message", () =>
      this.provider.extractJson({
        system: MESSAGE_SYSTEM,
        user: [
          `Client: ${c.clientName}`,
          `Deal: "${c.dealTitle}"`,
          `Stage: ${c.stage}`,
          `Goal: ${c.goal}`,
          `Manager (sender, signature): ${c.managerName}`,
          `Recent activities:\n${history}`,
          input.intent
            ? `Intent of the email: ${input.intent}`
            : "Intent: a general follow-up on the deal's current stage",
        ].join("\n"),
        toolName: MESSAGE_TOOL,
        toolDescription: "Draft follow-up email to the client",
        schema: MESSAGE_SCHEMA,
      }),
    );
    return coerceMessage(raw);
  }

  async describeProduct(input: {
    name: string;
    category: string;
    benefits: readonly string[];
  }): Promise<{ text: string; sourceUrl: string | null }> {
    const text = await this.withFeature("product_describe", () =>
      this.provider.completeText({
        system: PRODUCT_DESCRIBE_SYSTEM,
        user: [
          `Product: ${input.name}`,
          `Category: ${input.category}`,
          `Benefits: ${input.benefits.length ? input.benefits.join("; ") : "—"}`,
        ].join("\n"),
        maxTokens: 220,
      }),
    );
    // The URL doesn't come from the LLM (hallucination risk) — a deterministic search by name.
    const sourceUrl = `https://www.google.com/search?q=${encodeURIComponent(`${input.name} manufacturer`)}`;
    return { text: text.trim(), sourceUrl };
  }
}

function coerceMessage(raw: unknown): { subject: string; body: string } {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const str = (value: unknown): string =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : "";
  return { subject: str(obj.subject), body: str(obj.body) };
}

/** Context of a stalled deal for the advisor's prompt. */
function renderNextStepContext(context: NextStepContext): string {
  const history = context.recentActivities.length
    ? context.recentActivities.map((text) => `- ${text}`).join("\n")
    : "no history";
  return [
    `Deal: "${context.dealTitle}"`,
    `Client: ${context.clientName}`,
    `Stage: ${context.stage}`,
    `Goal: ${context.goal}`,
    `Recent activities:\n${history}`,
  ].join("\n");
}

/** Renders web-search results into compact text for the LLM (title/snippet/link). */
function renderWebResults(results: readonly WebSearchResult[]): string {
  if (results.length === 0) {
    return "no results";
  }
  return results
    .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   Link: ${r.url}`)
    .join("\n\n");
}

/** Renders the previous conversation turns for follow-up context (role + text). */
function renderConversation(conversation: readonly AssistantConversationTurn[]): string {
  return conversation
    .map((turn) => `${turn.role === "user" ? "Head of sales" : "Assistant"}: ${turn.text}`)
    .join("\n");
}

/** Renders the agent's step history into text: which tools were called and what they returned. */
function renderStepHistory(history: readonly AssistantStepRecord[]): string {
  if (history.length === 0) {
    return "(empty — this is the first step, nothing has been gathered yet)";
  }
  return history
    .map((step, i) => {
      const label =
        step.tool === "search_web"
          ? `search_web${step.query ? ` (query: "${step.query}")` : ""}`
          : "query_crm";
      return `Step ${i + 1} — ${label}:\n${step.result}`;
    })
    .join("\n\n");
}

/**
 * Parses the agent's decision from the model's (possibly invalid) output. Resilient:
 * on garbage / an unknown tool / no text it returns a safe final answer so the
 * use-case loop doesn't fail.
 */
function coerceDecision(raw: unknown): AssistantDecision {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  if (obj.kind === "tool") {
    if (obj.tool === "query_crm") {
      return { kind: "tool", tool: "query_crm" };
    }
    if (obj.tool === "search_web") {
      const query =
        typeof obj.query === "string" && obj.query.trim() !== "" ? obj.query.trim() : undefined;
      return query
        ? { kind: "tool", tool: "search_web", query }
        : { kind: "tool", tool: "search_web" };
    }
    // An unknown tool — don't execute it, answer safely instead.
    return { kind: "answer", text: ASSISTANT_FALLBACK_ANSWER };
  }
  if (obj.kind === "answer" && typeof obj.text === "string" && obj.text.trim() !== "") {
    return { kind: "answer", text: obj.text.trim() };
  }
  return { kind: "answer", text: ASSISTANT_FALLBACK_ANSWER };
}

const ASSISTANT_FALLBACK_ANSWER =
  "I couldn't process that question. Please rephrase it — for example, ask about " +
  "stalled deals, credit limits, manager workload, the pipeline, or a supplier search on the web.";

/** Renders the deterministic CRM snapshot into compact text for the LLM. */
function renderSnapshot(snapshot: CrmSnapshot): string {
  const deals = snapshot.deals.length
    ? snapshot.deals
        .map(
          (d) =>
            `- "${d.title}" | client: ${d.clientName} | manager: ${d.managerName} | stage: ${d.stage} | goal: ${d.goal}${d.stalled ? " | STALLED (no next step)" : ""}`,
        )
        .join("\n")
    : "no deals";
  const clients = snapshot.clientsWithDebt.length
    ? snapshot.clientsWithDebt
        .map(
          (c) =>
            `- ${c.clientName} | manager: ${c.managerName} | category: ${c.category} | balance: ${c.debt} | limit: ${c.creditLimit}${c.overLimit ? " | OVER LIMIT" : ""}`,
        )
        .join("\n")
    : "no client balance data";
  const managers = snapshot.managers.length
    ? snapshot.managers
        .map(
          (m) =>
            `- ${m.managerName}: ${m.activeDeals} active deals, ${m.stalledDeals} stalled, ${m.openTasks} open tasks`,
        )
        .join("\n")
    : "no managers";
  const f = snapshot.funnel;
  const funnel = [
    `total ${f.total}, active ${f.active}, won ${f.won}, lost ${f.lost}, win rate ${f.winRatePercent}%`,
    `by stage: ${f.byStage.map((b) => `${b.label} — ${b.count}`).join(", ") || "—"}`,
    `by goal: ${f.byGoal.map((b) => `${b.label} — ${b.count}`).join(", ") || "—"}`,
  ].join("\n");
  const pending = snapshot.pendingTests.length
    ? snapshot.pendingTests
        .map(
          (p) =>
            `- "${p.dealTitle}" | client: ${p.clientName} | technologist: ${p.technologistName}`,
        )
        .join("\n")
    : "none — every requested test has a test act, or no samples were requested";
  return [
    `DEALS:\n${deals}`,
    `PIPELINE:\n${funnel}`,
    `WAITING ON TEST RESULTS:\n${pending}`,
    `CLIENTS WITH A BALANCE (debt/limit):\n${clients}`,
    `MANAGER WORKLOAD:\n${managers}`,
  ].join("\n\n");
}

function coerceActivityDraft(raw: unknown): Omit<ActivityDraft, "nextStepDueDate"> {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const str = (value: unknown): string | null =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  const kind: ActivityKind = obj.kind === "call" ? "call" : obj.kind === "visit" ? "visit" : "note";
  return { kind, text: str(obj.text) ?? "", nextStepText: str(obj.nextStepText) };
}

function coerceDraft(raw: unknown): Omit<TestActDraft, "missingFields"> {
  const obj = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const str = (value: unknown): string | null =>
    typeof value === "string" && value.trim() !== "" ? value.trim() : null;
  const result: TestActResult =
    obj.result === "success" ? "success" : obj.result === "failure" ? "failure" : "unknown";
  return {
    clientName: str(obj.clientName),
    equipment: str(obj.equipment),
    productName: str(obj.productName),
    dosage: str(obj.dosage),
    processParams: str(obj.processParams),
    result,
    comment: str(obj.comment),
  };
}
