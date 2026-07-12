import { describe, expect, it } from "vitest";
import type {
  AiGateway,
  AssistantDecision,
  AssistantStepInput,
} from "@/application/ports/ai-gateway";
import type { WebSearchGateway, WebSearchResult } from "@/application/ports/web-search-gateway";
import type { Activity } from "@/domain/activity/activity";
import type { Client, ClientId } from "@/domain/client/client";
import type { ClientBalance } from "@/domain/client/client-balance";
import type { Deal } from "@/domain/deal/deal";
import { Money } from "@/domain/pricing/money";
import { makeId } from "@/domain/shared/id";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemorySampleRequestRepository } from "@/infrastructure/persistence/in-memory-sample-request-repository";
import { InMemoryTestActRepository } from "@/infrastructure/persistence/in-memory-test-act-repository";
import type { KnownPii, PseudonymScope } from "@/application/ports/pseudonym-scope";
import { makeAskManagerAssistant, sanitizeWebQuery } from "./ask-manager-assistant";

const c1 = makeId<"ClientId">("c1") as ClientId;
const c2 = makeId<"ClientId">("c2") as ClientId;
const d1 = makeId<"DealId">("d1");
const d2 = makeId<"DealId">("d2");

const clients: Client[] = [
  { id: c1, name: "Client One", type: "confectioner", category: "A", responsibleManagerId: "m1" },
  { id: c2, name: "Client Two", type: "confectioner", category: "B", responsibleManagerId: "m2" },
];
const deals: Deal[] = [
  { id: d1, clientId: c1, title: "Deal 1", stage: "audit", responsibleManagerId: "m1" },
  { id: d2, clientId: c2, title: "Deal 2", stage: "audit", responsibleManagerId: "m2" },
];
// d2 has an open task -> not "stalled"; d1 has no tasks -> "stalled".
const task: Activity = {
  id: makeId<"ActivityId">("a1"),
  dealId: d2,
  clientId: null,
  kind: "task",
  text: "call the client",
  author: "m2",
  createdAt: "2026-06-01T10:00:00.000Z",
  dueDate: "2026-06-10",
  done: false,
};
const balances: ClientBalance[] = [
  { clientId: c1, debt: Money.dollars(100_000), creditLimit: Money.dollars(50_000) }, // over limit
  { clientId: c2, debt: Money.dollars(10_000), creditLimit: Money.dollars(50_000) }, // within limit
];

/**
 * Scripted AI stub for the tool-agent: returns a predefined sequence of
 * `planAssistantStep` decisions, capturing the history it saw at each step (to
 * verify that gathered results reach the AI).
 */
function scriptedAi(
  script: readonly AssistantDecision[],
  capture: {
    histories: AssistantStepInput["history"][];
    conversations?: AssistantStepInput["conversation"][];
  },
): AiGateway {
  let step = 0;
  return {
    parseVoiceToActDraft: async () => {
      throw new Error("not used in this test");
    },
    draftActivityFromVoice: async () => ({
      kind: "note" as const,
      text: "",
      nextStepText: null,
      nextStepDueDate: null,
    }),
    suggestNextStep: async () => ({ suggestion: "not used" }),
    draftClientMessage: async () => ({ subject: "", body: "" }),
    draftProposalText: async () => "not used",
    describeProduct: async () => ({ text: "", sourceUrl: null }),
    answerManagerQuestion: async () => ({ answer: "not used" }),
    answerFromWebSearch: async () => ({ answer: "not used" }),
    planAssistantStep: async (input) => {
      capture.histories.push(input.history);
      capture.conversations?.push(input.conversation);
      const decision = script[Math.min(step, script.length - 1)] ?? script[script.length - 1];
      step++;
      if (!decision) throw new Error("empty decision script");
      return decision;
    },
  };
}

/** Web-search stub that captures the (post-sanitization) query it received. */
function fakeWebSearch(
  results: readonly WebSearchResult[],
  capture?: { query?: string },
): WebSearchGateway {
  return {
    search: async (query) => {
      if (capture) capture.query = query;
      return { query, results };
    },
  };
}

function build(ai: AiGateway, webSearch: WebSearchGateway, pseudonymScope?: PseudonymScope) {
  return makeAskManagerAssistant({
    deals: new InMemoryDealRepository(deals),
    clients: new InMemoryClientRepository(clients),
    activities: new InMemoryActivityRepository([task]),
    samples: new InMemorySampleRequestRepository(),
    testActs: new InMemoryTestActRepository(),
    erp: new StubErpGateway([], [], balances),
    ai,
    webSearch,
    ...(pseudonymScope ? { pseudonymScope } : {}),
    labelManager: (id) => `Manager ${id}`,
    labelPerson: (id) => `Technologist ${id}`,
  });
}

/** Scope that captures the sensitive data passed into run (to verify names collected from the CRM). */
function capturingScope(capture: { pii?: KnownPii }): PseudonymScope {
  let active: KnownPii | null = null;
  return {
    run: async (pii, fn) => {
      capture.pii = pii;
      active = pii;
      try {
        return await fn();
      } finally {
        active = null;
      }
    },
    current: () => active,
  };
}

const webResults: WebSearchResult[] = [
  { title: "Supplier A", snippet: "wholesale ingredients", url: "https://a.example" },
  { title: "Supplier B", snippet: "cocoa and chocolate", url: "https://b.example" },
];

describe("askManagerAssistant (tool-agent / ReAct)", () => {
  it("(a) CRM question: query_crm -> answer, source=crm, snapshot computed by code", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "query_crm" },
        { kind: "answer", text: '"Deal 1" is stalled with manager m1.' },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch([]));

    const result = await ask({ question: "what's stalled?" });

    expect(result.source).toBe("crm");
    expect(result.answer).toBe('"Deal 1" is stalled with manager m1.');
    // The snapshot was built and returned, its numbers are deterministic.
    const snap = result.snapshot;
    if (!snap) throw new Error("snapshot was not built");
    const byTitle = new Map(snap.deals.map((deal) => [deal.title, deal]));
    expect(byTitle.get("Deal 1")?.stalled).toBe(true);
    expect(byTitle.get("Deal 2")?.stalled).toBe(false);
    expect(snap.clientsWithDebt.find((c) => c.clientName === "Client One")?.overLimit).toBe(true);
    // On the second step, the AI saw the gathered snapshot in the history.
    const secondHistory = capture.histories[1];
    expect(secondHistory).toHaveLength(1);
    expect(secondHistory?.[0]?.tool).toBe("query_crm");
    expect(secondHistory?.[0]?.result).toContain("Deal 1");
    expect(result.webResults).toEqual([]);
  });

  it("(b) web question: search_web -> answer, source=web, webResults populated", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "search_web", query: "wholesale cocoa suppliers" },
        { kind: "answer", text: "Supplier A and B are relevant." },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch(webResults));

    const result = await ask({ question: "find cocoa suppliers" });

    expect(result.source).toBe("web");
    expect(result.answer).toBe("Supplier A and B are relevant.");
    expect(result.webResults).toEqual(webResults);
    // No CRM snapshot was built.
    expect(result.snapshot).toBeNull();
    // On the second step, the AI saw the web results in the history.
    expect(capture.histories[1]?.[0]?.tool).toBe("search_web");
    expect(capture.histories[1]?.[0]?.result).toContain("Supplier A");
  });

  it("(c) combined: search_web + query_crm -> answer, source=mixed", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "search_web", query: "cocoa market trends" },
        { kind: "tool", tool: "query_crm" },
        { kind: "answer", text: "Compared the market to our deals." },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch(webResults));

    const result = await ask({ question: "compare the cocoa market to our deals" });

    expect(result.source).toBe("mixed");
    expect(result.answer).toBe("Compared the market to our deals.");
    // Both sources were used.
    expect(result.snapshot).not.toBeNull();
    expect(result.webResults).toEqual(webResults);
    // On the third step, the history contains both web and CRM.
    const third = capture.histories[2];
    expect(third).toHaveLength(2);
    expect(third?.map((s) => s.tool)).toEqual(["search_web", "query_crm"]);
  });

  it("(d) step limit: AI keeps calling tools -> forced answer from what was gathered", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    // The AI stubbornly calls query_crm and never answers - but the forced step gives an answer.
    let calls = 0;
    const ai: AiGateway = {
      ...scriptedAi([{ kind: "tool", tool: "query_crm" }], capture),
      planAssistantStep: async (input) => {
        capture.histories.push(input.history);
        calls++;
        // Once the history contains the forced-answer instruction - answer.
        const last = input.history.at(-1)?.result ?? "";
        if (last.includes("give a final answer")) {
          return { kind: "answer", text: "Forced answer from what was gathered." };
        }
        return { kind: "tool", tool: "query_crm" };
      },
    };
    const ask = build(ai, fakeWebSearch([]));

    const result = await ask({ question: "loop me" });

    expect(result.answer).toBe("Forced answer from what was gathered.");
    expect(result.source).toBe("crm");
    // MAX_STEPS=4 loop iterations + 1 forced call.
    expect(calls).toBe(5);
  });

  it("(d2) step limit, the forced call still gives no answer -> synthesized from what was gathered (#14)", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const ai = scriptedAi([{ kind: "tool", tool: "query_crm" }], capture); // always a tool call
    const ask = build(ai, fakeWebSearch([]));

    const result = await ask({ question: "question" });

    // Not an empty stub: the gathered CRM snapshot stays in the answer (the source isn't lost).
    expect(result.source).toBe("crm");
    expect(result.snapshot).not.toBeNull();
    expect(result.answer).toContain("CRM snapshot");
    expect(result.answer).not.toBe("Could not gather an answer.");
  });

  it("(e) conversation context: conversation is passed into planAssistantStep (follow-up)", async () => {
    const capture = {
      histories: [] as AssistantStepInput["history"][],
      conversations: [] as AssistantStepInput["conversation"][],
    };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "search_web", query: "wholesale bakeries Denver" },
        { kind: "answer", text: "Sources are attached." },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch(webResults));

    const conversation = [
      { role: "user" as const, text: "Find bakeries in Denver" },
      { role: "assistant" as const, text: 'Found "Sunrise Bakery" and "Croissant & Co".' },
    ];
    // The follow-up "any links?" refers to the previous answer - the conversation must reach the AI.
    await ask({ question: "any links?", conversation });

    // At every step the planner saw the passed-in conversation context.
    expect(capture.conversations[0]).toEqual(conversation);
    expect(capture.conversations[0]?.[0]?.text).toBe("Find bakeries in Denver");
  });

  it("(e2) first question with no conversation -> planner receives undefined", async () => {
    const capture = {
      histories: [] as AssistantStepInput["history"][],
      conversations: [] as AssistantStepInput["conversation"][],
    };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "query_crm" },
        { kind: "answer", text: "ok" },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch([]));

    await ask({ question: "what's stalled?" });

    expect(capture.conversations[0]).toBeUndefined();
  });

  it("(f) sanitizeWebQuery: a phone number is scrubbed before it reaches web search", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const queryCapture: { query?: string } = {};
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "search_web", query: "cocoa supplier +1 (555) 123-4567 urgent" },
        { kind: "answer", text: "ok" },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch(webResults, queryCapture));

    await ask({ question: "find a supplier" });

    expect(queryCapture.query).toBeDefined();
    expect(queryCapture.query).not.toMatch(/\d{3}-\d{4}/);
    expect(queryCapture.query).not.toContain("555");
    expect(queryCapture.query).toContain("cocoa supplier");
    expect(queryCapture.query).toContain("urgent");
  });

  // --- #282/#296: per-request pseudonymization (sensitive names from the CRM -> scope) ---

  it("(g) collects client/manager/technologist names from the CRM into the pseudonym scope", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "query_crm" },
        { kind: "answer", text: "ok" },
      ],
      capture,
    );
    const scopeCapture: { pii?: KnownPii } = {};
    const ask = build(ai, fakeWebSearch([]), capturingScope(scopeCapture));

    await ask({ question: "what's stalled?" });

    const contacts = scopeCapture.pii?.contacts ?? [];
    // Client names (commercially sensitive) and manager names (personal data) were collected into the scope.
    expect(contacts).toContain("Client One");
    expect(contacts).toContain("Client Two");
    expect(contacts).toContain("Manager m1");
    expect(contacts).toContain("Manager m2");
  });

  it("(h) a known name is stripped from the outgoing web query (#282)", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const queryCapture: { query?: string } = {};
    // The model, against instructions, inserted a client name into the public search query.
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "search_web", query: "competitors of Client One bakeries Denver" },
        { kind: "answer", text: "ok" },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch(webResults, queryCapture), capturingScope({}));

    await ask({ question: "find competitors" });

    expect(queryCapture.query).toBeDefined();
    expect(queryCapture.query).not.toContain("Client One"); // the client's name is scrubbed
    expect(queryCapture.query).toContain("bakeries Denver"); // the public part remains
  });

  it("(i) without a scope it works as before (scope is optional)", async () => {
    const capture = { histories: [] as AssistantStepInput["history"][] };
    const ai = scriptedAi(
      [
        { kind: "tool", tool: "query_crm" },
        { kind: "answer", text: "ok without a scope" },
      ],
      capture,
    );
    const ask = build(ai, fakeWebSearch([])); // no scope passed

    const result = await ask({ question: "what's stalled?" });

    expect(result.answer).toBe("ok without a scope");
    expect(result.source).toBe("crm");
  });
});

describe("sanitizeWebQuery (data-protection guard)", () => {
  it("strips a US phone number with different separators", () => {
    expect(sanitizeWebQuery("call +1 (555) 123-4567")).not.toMatch(/\d/);
    expect(sanitizeWebQuery("tel 1-800-555-3535 supplier")).toBe("tel supplier");
  });

  it("a plain public query with no phone numbers is essentially unchanged", () => {
    expect(sanitizeWebQuery("wholesale cocoa suppliers USA")).toBe("wholesale cocoa suppliers USA");
  });

  it("short numbers (year, percentages) are NOT treated as a phone number", () => {
    // 4 digits and percentages aren't a phone number, they stay.
    expect(sanitizeWebQuery("cocoa market 2026 trends")).toContain("2026");
  });

  it("strips known client names from the query (case-insensitive)", () => {
    const out = sanitizeWebQuery("suppliers for client Sunrise LLC and John Smith", [
      "Sunrise LLC",
      "John Smith",
    ]);
    expect(out).not.toContain("Sunrise");
    expect(out).not.toContain("John");
    expect(out).toContain("suppliers");
  });

  it("a longer name is stripped before a shorter one (no leftover fragments)", () => {
    // "John Smith" should be removed whole, not leave a leftover "Smith" from a partial match.
    const out = sanitizeWebQuery("analysis John Smith market", ["John", "John Smith"]);
    expect(out).not.toMatch(/John/);
    expect(out).toContain("analysis");
    expect(out).toContain("market");
  });

  it("without a name list it behaves as before (phone numbers only)", () => {
    expect(sanitizeWebQuery("wholesale cocoa suppliers")).toBe("wholesale cocoa suppliers");
  });
});
