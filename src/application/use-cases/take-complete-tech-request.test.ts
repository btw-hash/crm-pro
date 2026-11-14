import { describe, expect, it } from "vitest";
import type { NotifyInput } from "@/application/ports/notifier";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { createTechRequest, TechRequestError } from "@/domain/tech-request/tech-request";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemoryTechRequestRepository } from "@/infrastructure/persistence/in-memory-tech-request-repository";
import { makeCompleteTechRequest } from "./complete-tech-request";
import { makeTakeTechRequest, TechRequestNotFoundError } from "./take-tech-request";

const dealId = makeId<"DealId">("d1");

const deal: Deal = {
  id: dealId,
  clientId: makeId<"ClientId">("c1"),
  title: "Noirelle chocolate introduction",
  stage: "testing",
  responsibleManagerId: "manager-x",
};

function seedRequest() {
  return createTechRequest({
    id: makeId<"TechRequestId">("tr1"),
    dealId,
    clientId: makeId<"ClientId">("c1"),
    kind: "test",
    note: "Product test at the plant",
    requestedBy: "manager-owens",
    createdAt: "2026-06-24T10:00:00Z",
  });
}

function buildComplete(options?: { withDeal?: boolean }) {
  const techRequests = new InMemoryTechRequestRepository([seedRequest()]);
  const deals = new InMemoryDealRepository(options?.withDeal === false ? [] : [deal]);
  const sent: NotifyInput[] = [];
  const notifier = {
    notify: async (input: NotifyInput) => {
      sent.push(input);
    },
  };
  const take = makeTakeTechRequest({ techRequests });
  const complete = makeCompleteTechRequest({ techRequests, deals, notifier });
  return { take, complete, techRequests, sent };
}

describe("takeTechRequest", () => {
  it("moves open → in_progress and sets assignedTo", async () => {
    const techRequests = new InMemoryTechRequestRepository([seedRequest()]);
    const useCase = makeTakeTechRequest({ techRequests });

    const updated = await useCase({ requestId: makeId("tr1"), technologistId: "tech-kent" });

    expect(updated.status).toBe("in_progress");
    expect(updated.assignedTo).toBe("tech-kent");
    expect((await techRequests.findById(makeId("tr1")))?.status).toBe("in_progress");
  });

  it("throws TechRequestNotFoundError for a non-existent request", async () => {
    const techRequests = new InMemoryTechRequestRepository();
    const useCase = makeTakeTechRequest({ techRequests });

    await expect(
      useCase({ requestId: makeId("missing"), technologistId: "tech-kent" }),
    ).rejects.toBeInstanceOf(TechRequestNotFoundError);
  });

  it("throws TechRequestError when taking it into work a second time", async () => {
    const techRequests = new InMemoryTechRequestRepository([seedRequest()]);
    const useCase = makeTakeTechRequest({ techRequests });

    await useCase({ requestId: makeId("tr1"), technologistId: "tech-kent" });
    await expect(
      useCase({ requestId: makeId("tr1"), technologistId: "tech-derek" }),
    ).rejects.toBeInstanceOf(TechRequestError);
  });
});

describe("completeTechRequest", () => {
  it("moves in_progress → done", async () => {
    const { take, complete, techRequests } = buildComplete();

    await take({ requestId: makeId("tr1"), technologistId: "tech-kent" });
    const done = await complete({ requestId: makeId("tr1") });

    expect(done.status).toBe("done");
    expect((await techRequests.findById(makeId("tr1")))?.status).toBe("done");
  });

  it("notifies the responsible manager when the request is completed", async () => {
    const { take, complete, sent } = buildComplete();

    await take({ requestId: makeId("tr1"), technologistId: "tech-kent" });
    await complete({ requestId: makeId("tr1") });

    expect(sent).toHaveLength(1);
    expect(sent[0]?.recipientId).toBe("manager-x");
    expect(sent[0]?.dealId).toBe(dealId);
  });

  it("completes without a notification if the deal is not found", async () => {
    const { take, complete, sent } = buildComplete({ withDeal: false });

    await take({ requestId: makeId("tr1"), technologistId: "tech-kent" });
    const done = await complete({ requestId: makeId("tr1") });

    expect(done.status).toBe("done");
    expect(sent).toHaveLength(0);
  });

  it("throws TechRequestError when completing from open (skipping in_progress)", async () => {
    const { complete } = buildComplete();

    await expect(complete({ requestId: makeId("tr1") })).rejects.toBeInstanceOf(TechRequestError);
  });

  it("throws TechRequestNotFoundError for a non-existent request", async () => {
    const techRequests = new InMemoryTechRequestRepository();
    const deals = new InMemoryDealRepository([]);
    const notifier = { notify: async () => {} };
    const complete = makeCompleteTechRequest({ techRequests, deals, notifier });

    await expect(complete({ requestId: makeId("missing") })).rejects.toBeInstanceOf(
      TechRequestNotFoundError,
    );
  });
});
