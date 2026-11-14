import { describe, expect, it } from "vitest";
import { LlmAiGateway } from "./llm-ai-gateway";
import { resolveRelativeDueDate } from "./relative-date";
import type {
  CompleteTextRequest,
  ExtractJsonRequest,
  LlmProvider,
  LlmResult,
} from "./llm/llm-provider";
import type { LlmFeatureScope } from "@/application/ports/llm-feature-scope";
import type { AiFeature } from "@/domain/ai/llm-usage";

class FakeProvider implements LlmProvider {
  lastExtract?: ExtractJsonRequest;
  lastText?: CompleteTextRequest;

  constructor(
    private readonly extractResult: unknown,
    private readonly textResult = "Proposal text",
  ) {}

  async extractJson(request: ExtractJsonRequest): Promise<unknown> {
    this.lastExtract = request;
    return this.extractResult;
  }

  async completeText(request: CompleteTextRequest): Promise<string> {
    this.lastText = request;
    return this.textResult;
  }

  async extractJsonWithUsage(request: ExtractJsonRequest): Promise<LlmResult<unknown>> {
    return { value: await this.extractJson(request), usage: null };
  }

  async completeTextWithUsage(request: CompleteTextRequest): Promise<LlmResult<string>> {
    return { value: await this.completeText(request), usage: null };
  }
}

describe("LlmAiGateway", () => {
  it("breaks down the provider's response (function calling) into a test-act draft", async () => {
    const provider = new FakeProvider({
      clientName: "Sweet World Confections",
      equipment: "Miwe Rotary Oven",
      productName: "Coverlux Cover Glaze",
      dosage: "12%",
      processParams: "180 °C, bake 15 min",
      result: "success",
      comment: "The technologist is satisfied",
    });
    const gateway = new LlmAiGateway(provider);

    const draft = await gateway.parseVoiceToActDraft({ transcript: "...report..." });

    expect(draft.productName).toBe("Coverlux Cover Glaze");
    expect(draft.result).toBe("success");
    expect(draft.missingFields).toEqual([]);
    expect(provider.lastExtract?.toolName).toBe("record_test_act_draft");
  });

  it("flags missing fields when the provider returns null/unknown", async () => {
    const provider = new FakeProvider({ result: "unknown" });
    const gateway = new LlmAiGateway(provider);

    const draft = await gateway.parseVoiceToActDraft({ transcript: "unclear" });

    expect(draft.missingFields).toContain("clientName");
    expect(draft.missingFields).toContain("productName");
    expect(draft.missingFields).toContain("result");
  });

  it("garbage from the provider doesn't crash the gateway (everything ends up missing)", async () => {
    const gateway = new LlmAiGateway(new FakeProvider("not-an-object"));

    const draft = await gateway.parseVoiceToActDraft({ transcript: "x" });

    expect(draft.result).toBe("unknown");
    expect(draft.clientName).toBeNull();
  });

  it("answerFromWebSearch: the prompt contains the question and snippets, the answer comes from the model", async () => {
    const provider = new FakeProvider({}, "Relevant cocoa suppliers for us…");
    const gateway = new LlmAiGateway(provider);

    const { answer } = await gateway.answerFromWebSearch({
      question: "find cocoa suppliers",
      results: [
        { title: "Supplier A", snippet: "cocoa powder wholesale", url: "https://a.example" },
        { title: "Supplier B", snippet: "chocolate and glazes", url: "https://b.example" },
      ],
    });

    expect(answer).toBe("Relevant cocoa suppliers for us…");
    // The question, snippets, and links went into the prompt — the model relies on what was found.
    expect(provider.lastText?.user).toContain("find cocoa suppliers");
    expect(provider.lastText?.user).toContain("cocoa powder wholesale");
    expect(provider.lastText?.user).toContain("https://a.example");
    // The system prompt sets Millbrook Foods' business context (ingredient distribution).
    expect(provider.lastText?.system).toContain("Millbrook Foods");
  });

  it("draftProposalText passes deterministic numbers into the prompt and returns text", async () => {
    const provider = new FakeProvider({}, "Dear partner! …");
    const gateway = new LlmAiGateway(provider);

    const text = await gateway.draftProposalText({
      clientName: "Sunrise Bakery Co.",
      productName: "Noirelle",
      savingsPerMonth: "$1,500.00",
      defectReductionPercent: 3,
    });

    expect(text).toBe("Dear partner! …");
    expect(provider.lastText?.user).toContain("Sunrise Bakery Co.");
    expect(provider.lastText?.user).toContain("Noirelle");
    // #462 §4.5: the client's economics (defect-rate reduction / monthly savings) aren't passed into the letter.
    expect(provider.lastText?.user).not.toContain("$1,500.00");
    expect(provider.lastText?.user).not.toContain("3%");
  });

  describe("draftActivityFromVoice (kind/step — LLM, due date — deterministic code)", () => {
    it('a dictated task: kind/step from the LLM, the day is computed by code from "tomorrow"', async () => {
      const provider = new FakeProvider({
        kind: "call",
        text: "Call Marina",
        nextStepText: "Call Marina at 5 pm",
      });
      const gateway = new LlmAiGateway(provider);
      const transcript = "tomorrow call Marina at 5 pm";

      const draft = await gateway.draftActivityFromVoice({ transcript });

      expect(draft.kind).toBe("call");
      expect(draft.nextStepText).toBe("Call Marina at 5 pm");
      // The date is NOT taken from the LLM (there's no such field in the schema) — it's computed deterministically by code.
      expect(draft.nextStepDueDate).toBe(resolveRelativeDueDate(transcript, new Date()));
      expect(draft.nextStepDueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // The prompt understands both a future task and the "call" kind.
      expect(provider.lastExtract?.system).toMatch(/task/i);
      expect(provider.lastExtract?.system).toContain("call");
    });

    it("no next step -> no due date either (null)", async () => {
      const provider = new FakeProvider({
        kind: "note",
        text: "The client is thinking it over",
        nextStepText: null,
      });
      const gateway = new LlmAiGateway(provider);

      const draft = await gateway.draftActivityFromVoice({
        transcript: "tomorrow he'll think it over",
      });

      expect(draft.nextStepText).toBeNull();
      // No day is set without a step, even if the text contains "tomorrow".
      expect(draft.nextStepDueDate).toBeNull();
    });

    it("garbage from the provider doesn't crash the gateway (note, no step or due date)", async () => {
      const gateway = new LlmAiGateway(new FakeProvider("not-an-object"));

      const draft = await gateway.draftActivityFromVoice({ transcript: "x" });

      expect(draft.kind).toBe("note");
      expect(draft.nextStepText).toBeNull();
      expect(draft.nextStepDueDate).toBeNull();
    });
  });

  describe("planAssistantStep (ReAct agent via extractJson)", () => {
    it('the decision "call the query_crm tool" is parsed from the provider\'s response', async () => {
      const provider = new FakeProvider({ kind: "tool", tool: "query_crm" });
      const gateway = new LlmAiGateway(provider);

      const decision = await gateway.planAssistantStep({
        question: "what deals have stalled?",
        history: [],
      });

      expect(decision).toEqual({ kind: "tool", tool: "query_crm" });
      // Via extractJson (instructed JSON), not native LLM tool-calling.
      expect(provider.lastExtract?.toolName).toBeTruthy();
    });

    it("the search_web decision keeps the search query", async () => {
      const provider = new FakeProvider({
        kind: "tool",
        tool: "search_web",
        query: "cocoa suppliers wholesale USA",
      });
      const gateway = new LlmAiGateway(provider);

      const decision = await gateway.planAssistantStep({
        question: "who's on the market?",
        history: [],
      });

      expect(decision).toEqual({
        kind: "tool",
        tool: "search_web",
        query: "cocoa suppliers wholesale USA",
      });
    });

    it("the final answer is parsed with text", async () => {
      const provider = new FakeProvider({ kind: "answer", text: '"Deal 1" has stalled.' });
      const gateway = new LlmAiGateway(provider);

      const decision = await gateway.planAssistantStep({
        question: "what's stalled?",
        history: [{ tool: "query_crm", result: 'DEALS: "Deal 1" — stalled' }],
      });

      expect(decision).toEqual({ kind: "answer", text: '"Deal 1" has stalled.' });
    });

    it("the step history is passed into the prompt (the AI sees what's been gathered)", async () => {
      const provider = new FakeProvider({ kind: "answer", text: "Done." });
      const gateway = new LlmAiGateway(provider);

      await gateway.planAssistantStep({
        question: "question",
        history: [
          {
            tool: "search_web",
            query: "cocoa suppliers",
            result: "1. Supplier A — cocoa wholesale",
          },
        ],
      });

      expect(provider.lastExtract?.user).toContain("cocoa suppliers");
      expect(provider.lastExtract?.user).toContain("Supplier A");
    });

    it("garbage from the provider -> a resilient final answer, doesn't crash", async () => {
      const gateway = new LlmAiGateway(new FakeProvider("not-an-object"));

      const decision = await gateway.planAssistantStep({ question: "x", history: [] });

      expect(decision.kind).toBe("answer");
      if (decision.kind !== "answer") throw new Error("expected an answer");
      expect(decision.text.length).toBeGreaterThan(0);
    });

    it("an unknown tool in the response -> a resilient final answer", async () => {
      const gateway = new LlmAiGateway(new FakeProvider({ kind: "tool", tool: "rm -rf" }));

      const decision = await gateway.planAssistantStep({ question: "x", history: [] });

      expect(decision.kind).toBe("answer");
    });

    it("tool without a query for search_web is still valid (query is optional)", async () => {
      const gateway = new LlmAiGateway(new FakeProvider({ kind: "tool", tool: "search_web" }));

      const decision = await gateway.planAssistantStep({ question: "x", history: [] });

      expect(decision).toEqual({ kind: "tool", tool: "search_web" });
    });
  });

  describe("token accounting (#216): feature tag via featureScope", () => {
    function recordingScope(): { scope: LlmFeatureScope; features: AiFeature[] } {
      const features: AiFeature[] = [];
      const scope: LlmFeatureScope = {
        run: async (feature, fn) => {
          features.push(feature);
          return fn();
        },
        current: () => features.at(-1) ?? null,
      };
      return { scope, features };
    }

    it("planAssistantStep runs under the assistant_plan tag", async () => {
      const { scope, features } = recordingScope();
      const gateway = new LlmAiGateway(new FakeProvider({ kind: "answer", text: "ok" }), scope);

      await gateway.planAssistantStep({ question: "q", history: [] });

      expect(features).toEqual(["assistant_plan"]);
    });

    it("draftProposalText runs under the proposal_text tag", async () => {
      const { scope, features } = recordingScope();
      const gateway = new LlmAiGateway(new FakeProvider({}, "text"), scope);

      await gateway.draftProposalText({
        clientName: "Client",
        productName: "Product",
        savingsPerMonth: "$1",
        defectReductionPercent: 1,
      });

      expect(features).toEqual(["proposal_text"]);
    });

    it("without a featureScope the gateway works as before (the wrappers are a no-op)", async () => {
      const gateway = new LlmAiGateway(new FakeProvider({ kind: "answer", text: "ok" }));

      const decision = await gateway.planAssistantStep({ question: "q", history: [] });

      expect(decision.kind).toBe("answer");
    });
  });
});
