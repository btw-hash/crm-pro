import { describe, expect, it } from "vitest";
import type { AiGateway, NextStepContext } from "@/application/ports/ai-gateway";
import type { Client, ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeSuggestNextStep } from "./suggest-next-step";

const clientId = makeId<"ClientId">("c1") as ClientId;
const dealId = makeId<"DealId">("d1");
const client: Client = {
  id: clientId,
  name: "Test Factory",
  type: "confectioner",
  category: "A",
  responsibleManagerId: "m1",
};
const deal: Deal = {
  id: dealId,
  clientId,
  title: "Stalled deal",
  stage: "quote",
  responsibleManagerId: "m1",
  goal: "order",
};

function fakeAi(capture: { ctx?: NextStepContext }): AiGateway {
  return {
    parseVoiceToActDraft: async () => {
      throw new Error("not used");
    },
    draftActivityFromVoice: async () => ({
      kind: "note",
      text: "",
      nextStepText: null,
      nextStepDueDate: null,
    }),
    draftClientMessage: async () => ({ subject: "", body: "" }),
    draftProposalText: async () => "not used",
    describeProduct: async () => ({ text: "", sourceUrl: null }),
    answerManagerQuestion: async () => ({ answer: "not used" }),
    answerFromWebSearch: async () => ({ answer: "not used" }),
    planAssistantStep: async () => ({ kind: "answer", text: "not used" }),
    suggestNextStep: async (ctx) => {
      capture.ctx = ctx;
      return { suggestion: "STEP FROM AI" };
    },
  };
}

describe("suggestNextStep", () => {
  it("gathers deal context (stage/goal labels, client) and returns a suggestion", async () => {
    const capture: { ctx?: NextStepContext } = {};
    const suggest = makeSuggestNextStep({
      deals: new InMemoryDealRepository([deal]),
      clients: new InMemoryClientRepository([client]),
      activities: new InMemoryActivityRepository([]),
      ai: fakeAi(capture),
    });

    const result = await suggest({ dealId });

    expect(result.suggestion).toBe("STEP FROM AI");
    expect(capture.ctx?.dealTitle).toBe("Stalled deal");
    expect(capture.ctx?.clientName).toBe("Test Factory");
    expect(capture.ctx?.stage).toBe("Proposal"); // label for the quote stage
    expect(capture.ctx?.goal).toBeTruthy();
  });

  it("non-existent deal → DealNotFoundError", async () => {
    const suggest = makeSuggestNextStep({
      deals: new InMemoryDealRepository([]),
      clients: new InMemoryClientRepository([]),
      activities: new InMemoryActivityRepository([]),
      ai: fakeAi({}),
    });

    await expect(suggest({ dealId: makeId<"DealId">("ghost") })).rejects.toBeInstanceOf(
      DealNotFoundError,
    );
  });
});
