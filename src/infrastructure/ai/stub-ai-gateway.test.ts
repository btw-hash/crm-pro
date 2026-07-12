import { describe, expect, it } from "vitest";
import type { CrmSnapshot } from "@/application/ports/ai-gateway";
import { StubAiGateway } from "./stub-ai-gateway";
import { resolveRelativeDueDate } from "./relative-date";

const ai = new StubAiGateway();

// A canonical example from the tech brief (a technologist's voice report).
const SAMPLE =
  "Okay, this is for SWEET WORLD BAKERY. We baked a batch of croissants today on the " +
  "Miwe. Used Carat Cover glaze, went with a 12% dosage by weight. Set the knead time " +
  "to 8 minutes, baked at 180 degrees for exactly 15 minutes. The dough didn't tear, " +
  "the glaze inside didn't scorch and didn't run onto the trays at all. The " +
  "technologist, Marina, is satisfied and signed off on the act.";

describe("StubAiGateway.parseVoiceToActDraft", () => {
  it("breaks a voice report down into the test-act draft's fields", async () => {
    const draft = await ai.parseVoiceToActDraft({ transcript: SAMPLE });

    expect(draft.clientName).toBe("Sweet World Confections");
    expect(draft.equipment).toBe("Miwe Rotary Oven");
    expect(draft.productName).toBe("Carat Cover Glaze");
    expect(draft.dosage).toBe("12%");
    expect(draft.processParams).toContain("180 °C");
    expect(draft.processParams).toContain("knead 8 min");
    expect(draft.processParams).toContain("bake 15 min");
    expect(draft.result).toBe("success");
    expect(draft.comment).toMatch(/Marina/);
    expect(draft.missingFields).toHaveLength(0);
  });

  it("takes numbers only from the text, never invents them (no dosage -> the field is empty)", async () => {
    const draft = await ai.parseVoiceToActDraft({
      transcript: "The Carat Cover glaze test on the Miwe went fine, the client is satisfied.",
    });

    expect(draft.dosage).toBeNull();
    expect(draft.missingFields).toContain("dosage");
  });

  it("recognizes a failure", async () => {
    const draft = await ai.parseVoiceToActDraft({
      transcript:
        "The S500 dough improver test at Sunrise Bakery Co. failed, the dough was ruined.",
    });

    expect(draft.result).toBe("failure");
  });

  it("understands numbers dictated as words (voice input)", async () => {
    const draft = await ai.parseVoiceToActDraft({
      transcript:
        "For Sweet World Confections, Carat Cover glaze, dosage twelve percent, baked at " +
        "one hundred eighty degrees for fifteen minutes, didn't run.",
    });

    expect(draft.dosage).toBe("12%");
    expect(draft.processParams).toContain("180 °C");
    expect(draft.processParams).toContain("bake 15 min");
    expect(draft.result).toBe("success");
    expect(draft.missingFields).toHaveLength(0);
  });

  it('parses voice with no punctuation: "200°" and the technologist\'s comment', async () => {
    const draft = await ai.parseVoiceToActDraft({
      transcript:
        "for sweet world bakery we baked a batch of buns on the miwe used carat glaze " +
        "dosage 17% knead time 10 minutes baked at 200° for exactly 10 minutes didn't run " +
        "technologist diane is satisfied signed the act",
    });

    expect(draft.dosage).toBe("17%");
    expect(draft.processParams).toContain("200 °C");
    expect(draft.result).toBe("success");
    expect(draft.comment).toMatch(/diane/i);
    expect(draft.comment).toMatch(/signed the act/i);
  });
});

const SNAPSHOT: CrmSnapshot = {
  deals: [
    {
      title: "Deal A",
      clientName: "Client A",
      managerName: "Alan Peterson",
      stage: "Proposal",
      goal: "New SKU listing",
      stalled: true,
    },
    {
      title: "Deal B",
      clientName: "Client B",
      managerName: "Daniel Owens",
      stage: "Testing",
      goal: "Order",
      stalled: false,
    },
  ],
  clientsWithDebt: [
    {
      clientName: "Client A",
      managerName: "Alan Peterson",
      category: "A",
      debt: "$1,200",
      creditLimit: "$600",
      overLimit: true,
    },
  ],
  managers: [{ managerName: "Alan Peterson", activeDeals: 3, stalledDeals: 1, openTasks: 2 }],
  funnel: {
    total: 5,
    active: 3,
    won: 1,
    lost: 1,
    winRatePercent: 50,
    byStage: [
      { label: "Proposal", count: 2 },
      { label: "Testing", count: 1 },
    ],
    byGoal: [{ label: "Order", count: 1 }],
  },
  pendingTests: [{ dealTitle: "Deal B", clientName: "Client B", technologistName: "Marina" }],
};

describe("StubAiGateway.answerManagerQuestion", () => {
  it("answers about stalled deals from the snapshot", async () => {
    const { answer } = await ai.answerManagerQuestion({
      question: "What deals have stalled?",
      snapshot: SNAPSHOT,
    });
    expect(answer).toContain("Deal A");
    expect(answer).not.toContain("Deal B");
  });

  it("lists overages for a credit-limit question", async () => {
    const { answer } = await ai.answerManagerQuestion({
      question: "Who's over their credit limit?",
      snapshot: SNAPSHOT,
    });
    expect(answer).toContain("Client A");
    expect(answer).toContain("$1,200");
  });

  it("gives a manager workload summary", async () => {
    const { answer } = await ai.answerManagerQuestion({
      question: "Show me manager workload",
      snapshot: SNAPSHOT,
    });
    expect(answer).toContain("Alan Peterson");
    expect(answer).toContain("3");
  });

  it("gives the pipeline's won/lost and stage breakdown", async () => {
    const { answer } = await ai.answerManagerQuestion({
      question: "How many did we win and what's the breakdown by stage?",
      snapshot: SNAPSHOT,
    });
    expect(answer).toMatch(/1 won/);
    expect(answer).toContain("Proposal — 2");
  });

  it("lists deals we're waiting on a test result for", async () => {
    const { answer } = await ai.answerManagerQuestion({
      question: "Which deals are we waiting on a test result for?",
      snapshot: SNAPSHOT,
    });
    expect(answer).toContain("Deal B");
    expect(answer).toContain("Marina");
  });
});

describe("StubAiGateway.draftActivityFromVoice", () => {
  it("a call with an agreement -> kind=call + next step", async () => {
    const draft = await ai.draftActivityFromVoice({
      transcript:
        "Called Sweet World Confections, discussed pricing, agreed to call back on Wednesday.",
    });
    expect(draft.kind).toBe("call");
    expect(draft.text).toContain("Sweet World Confections");
    expect(draft.nextStepText).toMatch(/call back|agreed/i);
  });

  it("a visit -> kind=visit", async () => {
    const draft = await ai.draftActivityFromVoice({
      transcript: "Went to see the technologist, showed the samples.",
    });
    expect(draft.kind).toBe("visit");
  });

  it("no markers -> kind=note, no next step or due date", async () => {
    const draft = await ai.draftActivityFromVoice({
      transcript: "The client is still thinking it over.",
    });
    expect(draft.kind).toBe("note");
    expect(draft.nextStepText).toBeNull();
    expect(draft.nextStepDueDate).toBeNull();
  });

  it('a dictated task "tomorrow call Marina at 5 pm" -> call + a step with a time + a due date', async () => {
    const transcript = "Tomorrow call Marina at 5 pm";
    const draft = await ai.draftActivityFromVoice({ transcript });

    expect(draft.kind).toBe("call");
    expect(draft.nextStepText).toMatch(/call marina/i);
    // The time of day stays in the step text (the date field doesn't hold it).
    expect(draft.nextStepText).toMatch(/5 pm/);
    // The day is recognized by code from "tomorrow" (not invented) — ISO format, matches the helper.
    expect(draft.nextStepDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(draft.nextStepDueDate).toBe(resolveRelativeDueDate(transcript, new Date()));
  });

  it('"the day after tomorrow go see the technologist" -> visit + due date +2 days', async () => {
    const transcript = "The day after tomorrow go see the technologist and show the samples";
    const draft = await ai.draftActivityFromVoice({ transcript });

    expect(draft.kind).toBe("visit");
    expect(draft.nextStepDueDate).toBe(resolveRelativeDueDate(transcript, new Date()));
    expect(draft.nextStepDueDate).not.toBeNull();
  });
});

describe("StubAiGateway.suggestNextStep", () => {
  const base = {
    dealTitle: "Deal",
    clientName: "Client X",
    goal: "Order",
    recentActivities: [],
  };

  it('stage "Proposal" -> a step about the proposal/shipment', async () => {
    const { suggestion } = await ai.suggestNextStep({ ...base, stage: "Proposal" });
    expect(suggestion).toMatch(/proposal|shipment/i);
  });

  it('stage "Production audit" -> a step about a visit/audit', async () => {
    const { suggestion } = await ai.suggestNextStep({ ...base, stage: "Production audit" });
    expect(suggestion).toMatch(/visit|audit/i);
  });

  it("an unknown stage -> a fallback step with the client's name", async () => {
    const { suggestion } = await ai.suggestNextStep({ ...base, stage: "Unknown" });
    expect(suggestion).toContain("Client X");
  });
});

describe("StubAiGateway.draftClientMessage", () => {
  const context = {
    clientName: "Test Bakery",
    dealTitle: "Glaze supply",
    stage: "Proposal",
    goal: "Order",
    managerName: "Alan Peterson",
    recentActivities: [],
  };

  it("no intent -> subject from the deal, the manager's signature in the body", async () => {
    const { subject, body } = await ai.draftClientMessage({ context, intent: null });
    expect(subject).toContain("Glaze supply");
    expect(body).toContain("Alan Peterson");
  });

  it("with intent -> reflected in the subject and body", async () => {
    const { subject, body } = await ai.draftClientMessage({
      context,
      intent: "follow up on the proposal",
    });
    expect(subject).toContain("follow up on the proposal");
    expect(body).toContain("follow up on the proposal");
  });
});

describe("StubAiGateway.answerFromWebSearch", () => {
  it("the deterministic summary contains the result count, titles, and all urls", async () => {
    const { answer } = await ai.answerFromWebSearch({
      question: "find cocoa suppliers",
      results: [
        { title: "Supplier A", snippet: "cocoa wholesale", url: "https://a.example" },
        { title: "Supplier B", snippet: "chocolate", url: "https://b.example" },
      ],
    });

    expect(answer).toContain("2 results");
    expect(answer).toContain('"Supplier A"');
    expect(answer).toContain("https://a.example");
    expect(answer).toContain("https://b.example");
  });

  it('an empty result list -> an honest "no results found" answer', async () => {
    const { answer } = await ai.answerFromWebSearch({ question: "something", results: [] });
    expect(answer).toContain("No results found");
  });
});

describe("StubAiGateway.planAssistantStep", () => {
  it("the first step for a question about our data -> calls query_crm", async () => {
    const decision = await ai.planAssistantStep({
      question: "what deals have stalled?",
      history: [],
    });
    expect(decision).toEqual({ kind: "tool", tool: "query_crm" });
  });

  it('the first step for an external question (keyword "find/supplier/market") -> calls search_web with the question', async () => {
    const decision = await ai.planAssistantStep({
      question: "find new cocoa suppliers on the market",
      history: [],
    });
    expect(decision).toEqual({
      kind: "tool",
      tool: "search_web",
      query: "find new cocoa suppliers on the market",
    });
  });

  it("a result already exists in history -> gives a final answer summarizing the last step", async () => {
    const decision = await ai.planAssistantStep({
      question: "what deals have stalled?",
      history: [{ tool: "query_crm", result: 'DEALS: "Deal 1" — stalled' }],
    });
    expect(decision.kind).toBe("answer");
    if (decision.kind !== "answer") throw new Error("expected an answer");
    expect(decision.text).toContain("Deal 1");
  });
});
