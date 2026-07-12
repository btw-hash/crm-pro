import type { ActivityRepository } from "@/application/ports/activity-repository";
import type {
  AiGateway,
  AssistantConversationTurn,
  AssistantStepRecord,
  CrmSnapshot,
  SnapshotClientDebt,
  SnapshotDeal,
  SnapshotFunnel,
  SnapshotManager,
  SnapshotPendingTest,
} from "@/application/ports/ai-gateway";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { KnownPii, PseudonymScope } from "@/application/ports/pseudonym-scope";
import type { SampleRequestRepository } from "@/application/ports/sample-request-repository";
import type { TestActRepository } from "@/application/ports/test-act-repository";
import type { WebSearchGateway, WebSearchResult } from "@/application/ports/web-search-gateway";
import type { Client } from "@/domain/client/client";
import type { ClientBalance } from "@/domain/client/client-balance";
import { isOverCreditLimit } from "@/domain/client/client-balance";
import { dealNeedsNextStep } from "@/domain/deal/deal-attention";
import { DEAL_GOAL_LABELS, DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { DEAL_STAGE_LABELS, type DealStage, isTerminal } from "@/domain/deal/deal-stage";
import { summarizeFunnel } from "@/domain/deal/funnel-analytics";

// Stages where a deal is implicitly waiting on a test result (even if a sample
// request was never filed explicitly). A deal is "awaiting test" if it's here, or a
// sample exists - and there's no act yet.
const TEST_PENDING_STAGES = new Set<DealStage>(["testing"]);

/** Dependencies for building the CRM snapshot for the head-of-sales assistant. */
interface AssistantDeps {
  deals: DealRepository;
  clients: ClientRepository;
  activities: ActivityRepository;
  samples: SampleRequestRepository;
  testActs: TestActRepository;
  erp: ErpGateway;
  labelManager: (id: string) => string;
  labelPerson: (id: string) => string;
}

export interface ManagerAssistantAnswer {
  readonly answer: string;
  /**
   * Source of the answer: a CRM snapshot, an external web search, or a combination
   * of both. The tool-agent picks its own tools, so the source is derived from
   * whatever was actually used.
   */
  readonly source: "crm" | "web" | "mixed";
  /** The snapshot the answer is based on - for transparency about "where the numbers come from". null if CRM wasn't queried. */
  readonly snapshot: CrmSnapshot | null;
  /** Web sources found (when web search was used) - shown to the user. */
  readonly webResults?: readonly WebSearchResult[];
}

export type AskManagerAssistant = (input: {
  question: string;
  /**
   * Previous turns of the conversation (for follow-ups like "any links?"). Passed
   * into the planner at every step; omitted on the first question of a conversation.
   */
  conversation?: readonly AssistantConversationTurn[];
}) => Promise<ManagerAssistantAnswer>;

/**
 * Step limit for the ReAct loop (tool calls) before a forced answer. Guards
 * against a loop if the AI keeps calling tools without ever answering.
 */
const MAX_STEPS = 4;

/**
 * The head-of-sales assistant as a ReAct tool-agent. Given a question, the AI itself
 * decides which tools to call: `query_crm` (a deterministic snapshot of our own
 * data) and/or `search_web` (the external internet), can combine both, and then
 * answers. Numbers are computed by code (the snapshot), not by the AI. The
 * "CRM vs web" routing is no longer regex-based - the model chooses it
 * (`ai.planAssistantStep`).
 *
 * Data-protection guard: the outgoing web query is scrubbed by `sanitizeWebQuery`
 * (phone numbers etc.); the full CRM snapshot is never sent to web search - only
 * the AI's own query goes out.
 */
export function makeAskManagerAssistant(
  deps: AssistantDeps & {
    ai: AiGateway;
    webSearch: WebSearchGateway;
    /**
     * Per-request scope of known personal/sensitive data. The use-case collects names
     * (clients, managers, technologists) and runs the AI calls inside `run` - the
     * global pseudonymizer masks them before they go to the LLM (#282/#296). Optional:
     * without it, behavior is unchanged (phone numbers + static lists only).
     */
    pseudonymScope?: PseudonymScope;
  },
): AskManagerAssistant {
  return async ({ question, conversation }) => {
    // Collect the request's known sensitive data (names of clients/managers/technologists
    // from the CRM) exactly once, up front: needed both to mask LLM calls (scope) and to
    // scrub the outgoing web query.
    const knownPii = await collectKnownPii(deps);

    const run = <T>(fn: () => Promise<T>): Promise<T> =>
      deps.pseudonymScope ? deps.pseudonymScope.run(knownPii, fn) : fn();

    return run(() => runAgentLoop(deps, { question, conversation }, knownPii));
  };
}

/** The agent's ReAct loop (runs inside the active pseudonym scope, if one was given). */
async function runAgentLoop(
  deps: AssistantDeps & { ai: AiGateway; webSearch: WebSearchGateway },
  {
    question,
    conversation,
  }: { question: string; conversation?: readonly AssistantConversationTurn[] },
  knownPii: KnownPii,
): Promise<ManagerAssistantAnswer> {
  const history: AssistantStepRecord[] = [];
  let snapshot: CrmSnapshot | null = null;
  let usedCrm = false;
  let webResults: readonly WebSearchResult[] = [];
  let usedWeb = false;

  for (let i = 0; i < MAX_STEPS; i++) {
    const decision = await deps.ai.planAssistantStep({ question, history, conversation });
    if (decision.kind === "answer") {
      return finalize(decision.text, usedCrm, usedWeb, snapshot, webResults);
    }
    if (decision.tool === "query_crm") {
      snapshot = await buildSnapshot(deps);
      usedCrm = true;
      history.push({ tool: "query_crm", result: renderSnapshotForAgent(snapshot) });
    } else {
      usedWeb = true;
      // Scrub the outgoing query: phone numbers + known names from the CRM (data protection, #282).
      const query = sanitizeWebQuery(decision.query ?? question, knownPii.contacts);
      const res = await deps.webSearch.search(query);
      webResults = res.results;
      history.push({ tool: "search_web", query, result: renderWebResultsForAgent(res.results) });
    }
  }

  // Step limit reached - synthesize a final answer from whatever was already
  // gathered, without discarding it (a stub answer would drop the collected
  // snapshot/web results; #14).
  const forced = await deps.ai.planAssistantStep({
    question,
    conversation,
    history: [
      ...history,
      {
        tool: history.at(-1)?.tool ?? "query_crm",
        result:
          "(give a final answer based on the data gathered above now, do not call any more tools)",
      },
    ],
  });
  // If the forced step still didn't produce an answer, don't return an empty stub:
  // honestly report what was actually gathered (the snapshot/web results remain in
  // the answer for source transparency).
  const answer = forced.kind === "answer" ? forced.text : synthesizeFromCollected(usedCrm, usedWeb);
  return finalize(answer, usedCrm, usedWeb, snapshot, webResults);
}

/**
 * Fallback answer for when the model still hasn't produced any text after the
 * forced step: instead of an empty stub, honestly report that data was gathered but
 * no answer was formulated, and name the sources that were used (the snapshot stays
 * in `ManagerAssistantAnswer`).
 */
function synthesizeFromCollected(usedCrm: boolean, usedWeb: boolean): string {
  if (!usedCrm && !usedWeb) {
    return "Could not gather data for this question. Please rephrase it.";
  }
  const sources = [usedCrm ? "CRM snapshot" : null, usedWeb ? "web search" : null]
    .filter((s): s is string => s !== null)
    .join(" and ");
  return (
    `Could not formulate a conclusion, but data was gathered (${sources}). ` +
    "Rephrase your question more specifically - the data is available in the answer's source."
  );
}

/** Final answer of the agent: the source is derived from which tools were used. */
function finalize(
  answer: string,
  usedCrm: boolean,
  usedWeb: boolean,
  snapshot: CrmSnapshot | null,
  webResults: readonly WebSearchResult[],
): ManagerAssistantAnswer {
  const source: ManagerAssistantAnswer["source"] =
    usedCrm && usedWeb ? "mixed" : usedWeb ? "web" : "crm";
  return { answer, source, snapshot, webResults };
}

/**
 * Data-protection guard for the outgoing web query: strips phone numbers (RU/intl)
 * and known names from the CRM so sensitive data can't leak into public search. The
 * AI is instructed not to put client names/internal data into the query (see the
 * `planAssistantStep` prompt), but this is a guard in case the model inserts them
 * anyway (#282). The full CRM snapshot never goes into the search - only the AI's
 * own query.
 */
export function sanitizeWebQuery(query: string, knownContacts: readonly string[] = []): string {
  let out = query
    // Phone numbers: +7/8 and 10-11 digits with separators (space/parens/dash).
    .replace(/(?:\+?\d[\s\-()]*){10,}/g, " ");
  // Known names/contacts - exact match (longest first, so "John Smith" is removed
  // before the leftover "John"/"Smith" pieces would match). Case-insensitive.
  for (const name of [...new Set(knownContacts)]
    .filter((s) => s.trim() !== "")
    .sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(escapeRegExp(name), "giu"), " ");
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/** Escapes a string for safe use inside a RegExp. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * Collects the request's known sensitive data for masking: manager/technologist
 * names (personal data - always masked) and client names (commercially sensitive),
 * which would otherwise end up in the LLM/web as part of the snapshot/query. Tax IDs
 * aren't in the snapshot yet - `taxIds` stays empty (the `knownTaxIds` mechanism is
 * ready; it'll kick in once tax IDs reach the assistant's data, #296).
 */
async function collectKnownPii(deps: AssistantDeps): Promise<KnownPii> {
  const [deals, clients] = await Promise.all([deps.deals.list(), deps.clients.list()]);

  const contacts = new Set<string>();
  for (const client of clients) {
    if (client.name.trim() !== "") {
      contacts.add(client.name);
    }
  }
  // Manager names - from deal/client owners.
  const managerIds = new Set<string>([
    ...deals.map((d) => d.responsibleManagerId),
    ...clients.map((c) => c.responsibleManagerId),
  ]);
  for (const id of managerIds) {
    const label = deps.labelManager(id);
    if (label.trim() !== "") {
      contacts.add(label);
    }
  }
  // Technologist names - from those assigned to deal samples.
  const technologistIds = new Set<string>();
  await Promise.all(
    deals.map(async (deal) => {
      const samples = await deps.samples.listByDeal(deal.id);
      for (const sample of samples) {
        if (sample.assignedTechnologistId) {
          technologistIds.add(sample.assignedTechnologistId);
        }
      }
    }),
  );
  for (const id of technologistIds) {
    const label = deps.labelPerson(id);
    if (label.trim() !== "") {
      contacts.add(label);
    }
  }

  return { contacts: [...contacts], taxIds: [] };
}

/** Compact text rendering of the CRM snapshot for the agent's "memory" (numbers are already computed by code). */
function renderSnapshotForAgent(s: CrmSnapshot): string {
  const deals = s.deals.length
    ? s.deals
        .map(
          (d) =>
            `- "${d.title}" | client: ${d.clientName} | manager: ${d.managerName} | stage: ${d.stage} | goal: ${d.goal}${d.stalled ? " | STALLED" : ""}`,
        )
        .join("\n")
    : "no deals";
  const clients = s.clientsWithDebt.length
    ? s.clientsWithDebt
        .map(
          (c) =>
            `- ${c.clientName} | manager: ${c.managerName} | debt: ${c.debt} | limit: ${c.creditLimit}${c.overLimit ? " | OVER LIMIT" : ""}`,
        )
        .join("\n")
    : "no balance data";
  const managers = s.managers.length
    ? s.managers
        .map(
          (m) =>
            `- ${m.managerName}: active ${m.activeDeals}, stalled ${m.stalledDeals}, open tasks ${m.openTasks}`,
        )
        .join("\n")
    : "no managers";
  const f = s.funnel;
  const funnel = `total ${f.total}, active ${f.active}, won ${f.won}, lost ${f.lost}, win rate ${f.winRatePercent}%`;
  const pending = s.pendingTests.length
    ? s.pendingTests
        .map(
          (p) =>
            `- "${p.dealTitle}" | client: ${p.clientName} | technologist: ${p.technologistName}`,
        )
        .join("\n")
    : "none";
  return [
    `DEALS:\n${deals}`,
    `FUNNEL: ${funnel}`,
    `AWAITING TEST RESULT:\n${pending}`,
    `CLIENTS WITH A BALANCE:\n${clients}`,
    `MANAGER WORKLOAD:\n${managers}`,
  ].join("\n\n");
}

/** Compact text rendering of web search results for the agent's "memory". */
function renderWebResultsForAgent(results: readonly WebSearchResult[]): string {
  if (results.length === 0) {
    return "no results found in open sources for this query";
  }
  return results.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`).join("\n");
}

async function buildSnapshot(deps: AssistantDeps): Promise<CrmSnapshot> {
  const [deals, clients] = await Promise.all([deps.deals.list(), deps.clients.list()]);
  const clientById = new Map(clients.map((client) => [client.id, client]));

  // For each deal: activities (for "stalled"/tasks), samples and act (for the test status).
  const enriched = await Promise.all(
    deals.map(async (deal) => {
      const [activities, samples, act] = await Promise.all([
        deps.activities.listByDeal(deal.id),
        deps.samples.listByDeal(deal.id),
        deps.testActs.findByDealId(deal.id),
      ]);
      return {
        deal,
        stalled: dealNeedsNextStep(deal, activities),
        openTasks: activities.filter((a) => a.kind === "task" && !a.done).length,
        // Awaiting test result: no act yet AND (there's a sample OR the deal is at the testing stage).
        awaitingTest: act === null && (samples.length > 0 || TEST_PENDING_STAGES.has(deal.stage)),
        technologistId: samples[0]?.assignedTechnologistId ?? null,
      };
    }),
  );

  const snapshotDeals: SnapshotDeal[] = enriched.map(({ deal, stalled }) => ({
    title: deal.title,
    clientName: clientById.get(deal.clientId)?.name ?? "-",
    managerName: deps.labelManager(deal.responsibleManagerId),
    stage: DEAL_STAGE_LABELS[deal.stage],
    goal: DEAL_GOAL_LABELS[deal.goal ?? DEFAULT_DEAL_GOAL],
    stalled,
  }));

  const managerIds = [...new Set(deals.map((deal) => deal.responsibleManagerId))];
  const managers: SnapshotManager[] = managerIds
    .map((id) => {
      const own = enriched.filter(({ deal }) => deal.responsibleManagerId === id);
      return {
        managerName: deps.labelManager(id),
        activeDeals: own.filter(({ deal }) => !isTerminal(deal.stage)).length,
        stalledDeals: own.filter(({ stalled }) => stalled).length,
        openTasks: own.reduce((sum, { openTasks }) => sum + openTasks, 0),
      };
    })
    .sort((a, b) => b.activeDeals - a.activeDeals);

  const balances = await Promise.all(
    clients.map(async (client) => ({
      client,
      balance: await deps.erp.getClientBalance(client.id),
    })),
  );
  const clientsWithDebt: SnapshotClientDebt[] = balances
    .filter((row): row is { client: Client; balance: ClientBalance } => row.balance !== null)
    .map(({ client, balance }) => ({
      clientName: client.name,
      managerName: deps.labelManager(client.responsibleManagerId),
      category: client.category,
      debt: balance.debt.format(),
      creditLimit: balance.creditLimit.format(),
      overLimit: isOverCreditLimit(balance),
    }));

  // Funnel: a deterministic summary (numbers from summarizeFunnel, labels for the AI).
  const f = summarizeFunnel(deals);
  const funnel: SnapshotFunnel = {
    total: f.total,
    active: f.active,
    won: f.won,
    lost: f.lost,
    winRatePercent: Math.round(f.winRate * 100),
    byStage: f.byStage
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => ({ label: DEAL_STAGE_LABELS[bucket.stage], count: bucket.count })),
    byGoal: f.byGoal
      .filter((bucket) => bucket.count > 0)
      .map((bucket) => ({ label: DEAL_GOAL_LABELS[bucket.goal], count: bucket.count })),
  };

  const pendingTests: SnapshotPendingTest[] = enriched
    .filter((row) => row.awaitingTest)
    .map((row) => ({
      dealTitle: row.deal.title,
      clientName: clientById.get(row.deal.clientId)?.name ?? "-",
      technologistName: row.technologistId ? deps.labelPerson(row.technologistId) : "-",
    }));

  return { deals: snapshotDeals, clientsWithDebt, managers, funnel, pendingTests };
}
