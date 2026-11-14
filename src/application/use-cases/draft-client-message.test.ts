import { describe, expect, it } from "vitest";
import type { AiGateway, DealMessageContext } from "@/application/ports/ai-gateway";
import type { Client, ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeDraftClientMessage } from "./draft-client-message";

const clientId = makeId<"ClientId">("c1") as ClientId;
const dealId = makeId<"DealId">("d1");
const client: Client = {
  id: clientId,
  name: "Warm Bread Bakery",
  type: "confectioner",
  category: "A",
  responsibleManagerId: "m1",
};
const deal: Deal = {
  id: dealId,
  clientId,
  title: "Levara Sourdough Starter",
  stage: "quote",
  responsibleManagerId: "m1",
  goal: "order",
};

interface Capture {
  ctx?: DealMessageContext;
  intent?: string | null;
}

function fakeAi(capture: Capture): AiGateway {
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
    draftProposalText: async () => "not used",
    describeProduct: async () => ({ text: "", sourceUrl: null }),
    answerManagerQuestion: async () => ({ answer: "not used" }),
    answerFromWebSearch: async () => ({ answer: "not used" }),
    planAssistantStep: async () => ({ kind: "answer", text: "not used" }),
    suggestNextStep: async () => ({ suggestion: "not used" }),
    draftClientMessage: async (input) => {
      capture.ctx = input.context;
      capture.intent = input.intent;
      return { subject: "SUBJECT", body: "BODY" };
    },
  };
}

function build(capture: Capture, deals: Deal[], clients: Client[]) {
  return makeDraftClientMessage({
    deals: new InMemoryDealRepository(deals),
    clients: new InMemoryClientRepository(clients),
    activities: new InMemoryActivityRepository([]),
    ai: fakeAi(capture),
    labelManager: (id) => `M-${id}`,
  });
}

describe("draftClientMessage", () => {
  it("gathers deal context and forwards the intent; returns the AI's draft", async () => {
    const capture: Capture = {};
    const result = await build(
      capture,
      [deal],
      [client],
    )({
      dealId,
      intent: "follow up on the proposal",
    });

    expect(result).toEqual({ subject: "SUBJECT", body: "BODY" });
    expect(capture.ctx?.clientName).toBe("Warm Bread Bakery");
    expect(capture.ctx?.managerName).toBe("M-m1");
    expect(capture.ctx?.stage).toBe("Proposal");
    expect(capture.intent).toBe("follow up on the proposal");
  });

  it("empty/whitespace intent → intent=null", async () => {
    const capture: Capture = {};
    await build(capture, [deal], [client])({ dealId, intent: "   " });
    expect(capture.intent).toBeNull();
  });

  it("empty draft from the AI → error (not treated as success)", async () => {
    const emptyAi: AiGateway = {
      ...fakeAi({}),
      draftClientMessage: async () => ({ subject: "  ", body: "" }),
    };
    const draft = makeDraftClientMessage({
      deals: new InMemoryDealRepository([deal]),
      clients: new InMemoryClientRepository([client]),
      activities: new InMemoryActivityRepository([]),
      ai: emptyAi,
      labelManager: (id) => id,
    });
    await expect(draft({ dealId })).rejects.toThrow(/empty/i);
  });

  it("deal doesn't exist → DealNotFoundError", async () => {
    await expect(build({}, [], [])({ dealId: makeId<"DealId">("ghost") })).rejects.toBeInstanceOf(
      DealNotFoundError,
    );
  });
});
