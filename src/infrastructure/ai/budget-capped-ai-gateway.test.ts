import { describe, expect, it } from "vitest";
import type { AiGateway } from "@/application/ports/ai-gateway";
import { BudgetCappedAiGateway } from "./budget-capped-ai-gateway";

const draft = { comment: "from provider" };

function fakeGateway(tag: "live" | "stub"): AiGateway {
  return {
    parseVoiceToActDraft: async () => ({
      clientName: null,
      equipment: null,
      productName: null,
      dosage: null,
      processParams: null,
      result: "unknown",
      comment: `${tag}:${draft.comment}`,
      missingFields: [],
    }),
    draftActivityFromVoice: async () => ({
      kind: "note",
      text: `${tag}:activity`,
      nextStepText: null,
      nextStepDueDate: null,
    }),
    draftProposalText: async () => `${tag}:proposal`,
    describeProduct: async () => ({ text: `${tag}:describe`, sourceUrl: null }),
    answerManagerQuestion: async () => ({ answer: `${tag}:answer` }),
    answerFromWebSearch: async () => ({ answer: `${tag}:web-answer` }),
    planAssistantStep: async () => ({ kind: "answer", text: `${tag}:plan` }),
    suggestNextStep: async () => ({ suggestion: `${tag}:suggestion` }),
    draftClientMessage: async () => ({ subject: `${tag}:subject`, body: `${tag}:body` }),
  };
}

const context = { dealTitle: "d", clientName: "c", stage: "s", goal: "g", recentActivities: [] };
const messageInput = {
  context: {
    clientName: "c",
    dealTitle: "d",
    stage: "s",
    goal: "g",
    managerName: "m",
    recentActivities: [],
  },
  intent: null,
};

describe("BudgetCappedAiGateway", () => {
  it("routes to the live gateway while under the daily budget", async () => {
    const gateway = new BudgetCappedAiGateway({
      live: fakeGateway("live"),
      stub: fakeGateway("stub"),
      dailyLimit: 2,
    });

    const { suggestion } = await gateway.suggestNextStep(context);

    expect(suggestion).toBe("live:suggestion");
  });

  it("falls back to the stub once the daily budget is spent, with an honest note", async () => {
    const gateway = new BudgetCappedAiGateway({
      live: fakeGateway("live"),
      stub: fakeGateway("stub"),
      dailyLimit: 1,
    });

    const first = await gateway.suggestNextStep(context);
    const second = await gateway.suggestNextStep(context);

    expect(first.suggestion).toBe("live:suggestion");
    expect(second.suggestion).toContain("stub:suggestion");
    expect(second.suggestion).toMatch(/budget exhausted for today/i);
  });

  it("counts every AiGateway method call against the same daily budget", async () => {
    const gateway = new BudgetCappedAiGateway({
      live: fakeGateway("live"),
      stub: fakeGateway("stub"),
      dailyLimit: 1,
    });

    const answer = await gateway.answerManagerQuestion({
      question: "q",
      snapshot: {
        deals: [],
        clientsWithDebt: [],
        managers: [],
        funnel: {
          total: 0,
          active: 0,
          won: 0,
          lost: 0,
          winRatePercent: 0,
          byStage: [],
          byGoal: [],
        },
        pendingTests: [],
      },
    });
    const proposal = await gateway.draftProposalText({
      clientName: "c",
      productName: "p",
      savingsPerMonth: "$1",
      defectReductionPercent: 1,
    });

    expect(answer.answer).toBe("live:answer");
    expect(proposal).toContain("budget exhausted for today");
  });

  it("prefixes the note onto the right field for every method shape", async () => {
    const gateway = new BudgetCappedAiGateway({
      live: fakeGateway("live"),
      stub: fakeGateway("stub"),
      dailyLimit: 0,
    });

    const act = await gateway.parseVoiceToActDraft({ transcript: "t" });
    const activity = await gateway.draftActivityFromVoice({ transcript: "t" });
    const message = await gateway.draftClientMessage(messageInput);
    const product = await gateway.describeProduct({ name: "n", category: "c", benefits: [] });
    const plan = await gateway.planAssistantStep({ question: "q", history: [] });

    expect(act.comment).toMatch(/budget exhausted for today/i);
    expect(activity.text).toMatch(/budget exhausted for today/i);
    expect(message.body).toMatch(/budget exhausted for today/i);
    expect(message.subject).toBe("stub:subject"); // subject is untouched -- only the free-text body carries the note
    expect(product.text).toMatch(/budget exhausted for today/i);
    expect(plan.kind).toBe("answer");
    if (plan.kind === "answer") {
      expect(plan.text).toMatch(/budget exhausted for today/i);
    }
  });

  it("resets the budget on a new UTC day", async () => {
    let day = "2026-07-12T23:59:00.000Z";
    const gateway = new BudgetCappedAiGateway({
      live: fakeGateway("live"),
      stub: fakeGateway("stub"),
      dailyLimit: 1,
      now: () => new Date(day),
    });

    const dayOne = await gateway.suggestNextStep(context);
    const stillDayOne = await gateway.suggestNextStep(context);
    day = "2026-07-13T00:01:00.000Z";
    const dayTwo = await gateway.suggestNextStep(context);

    expect(dayOne.suggestion).toBe("live:suggestion");
    expect(stillDayOne.suggestion).toContain("budget exhausted");
    expect(dayTwo.suggestion).toBe("live:suggestion");
  });
});
