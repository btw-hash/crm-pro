import { describe, expect, it } from "vitest";
import type { NotifyInput } from "@/application/ports/notifier";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import type { DealStage } from "@/domain/deal/deal-stage";
import type { SampleRequest } from "@/domain/sample/sample-request";
import { makeId } from "@/domain/shared/id";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemorySampleRequestRepository } from "@/infrastructure/persistence/in-memory-sample-request-repository";
import { StoringDealEventRecorder } from "@/infrastructure/persistence/storing-deal-event-recorder";
import { DealNotFoundError } from "./advance-deal-stage";
import {
  InsufficientStockError,
  makeRequestSample,
  type RequestSampleInput,
  SampleRequestStageError,
} from "./request-sample";

const dealId = makeId<"DealId">("d1");
const productId = makeId<"ProductId">("p1");
const technologistIds = ["tech-a", "tech-b"];

function dealAt(stage: DealStage): Deal {
  return {
    id: dealId,
    clientId: makeId<"ClientId">("c1") as ClientId,
    title: "Deal",
    stage,
    responsibleManagerId: "manager-owens",
  };
}

function build(
  stage: DealStage,
  options: { freeQuantity?: number; seedSamples?: readonly SampleRequest[] } = {},
) {
  const { freeQuantity = 40, seedSamples = [] } = options;
  const deals = new InMemoryDealRepository([dealAt(stage)]);
  const samples = new InMemorySampleRequestRepository(seedSamples);
  const erp = new StubErpGateway([], [{ productId, freeQuantity, unit: "kg" }], []);
  const sent: NotifyInput[] = [];
  const notifier = {
    notify: async (notifyInput: NotifyInput) => {
      sent.push(notifyInput);
    },
  };
  const events = new InMemoryDealEventRepository();
  return {
    request: makeRequestSample({
      deals,
      samples,
      erp,
      notifier,
      events: new StoringDealEventRecorder(events),
      technologistIds,
    }),
    deals,
    samples,
    erp,
    sent,
    events,
  };
}

function input(quantity = 2, overrides: Partial<RequestSampleInput> = {}): RequestSampleInput {
  return {
    id: makeId<"SampleRequestId">("s1"),
    dealId,
    productId,
    quantity,
    requestedBy: "manager-owens",
    requestedAt: "2026-06-21T00:00:00Z",
    ...overrides,
  };
}

function priorSample(assignedTechnologistId: string): SampleRequest {
  return {
    id: makeId<"SampleRequestId">("s-prior"),
    dealId: makeId<"DealId">("d-prior"),
    productId,
    quantity: 1,
    unit: "kg",
    requestedBy: "manager-grant",
    assignedTechnologistId,
    requestedAt: "2026-06-20T00:00:00Z",
  };
}

describe("requestSample", () => {
  it("reserves a sample, records the request, and moves the deal into the testing stage", async () => {
    const { request, deals, samples, erp } = build("audit");

    const created = await request(input(2));

    expect(created.quantity).toBe(2);
    expect((await deals.findById(dealId))?.stage).toBe("testing");
    expect(await samples.listByDeal(dealId)).toHaveLength(1);
    // Free stock decreased by 2.
    expect((await erp.getStockLevel(productId))?.freeQuantity).toBe(38);
  });

  it("records the stage change in the event log", async () => {
    const { request, events } = build("audit");

    await request(input(2));

    const recorded = await events.listByDeal(dealId);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.type).toBe("stage_changed");
    expect(recorded[0]?.fromStage).toBe("audit");
    expect(recorded[0]?.toStage).toBe("testing");
  });

  it("assigns the first technologist and notifies them when there are no prior requests", async () => {
    const { request, sent } = build("audit");

    const created = await request(input(2));

    expect(created.assignedTechnologistId).toBe("tech-a");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.recipientId).toBe("tech-a");
    expect(sent[0]?.dealId).toBe(dealId);
    // The notification text carries the deal and the deterministic reserved quantity.
    expect(sent[0]?.message).toContain('"Deal"');
    expect(sent[0]?.message).toContain("2 kg");
  });

  it("routes to the next technologist round-robin", async () => {
    const { request } = build("audit", { seedSamples: [priorSample("tech-a")] });

    const created = await request(input(2));

    expect(created.assignedTechnologistId).toBe("tech-b");
  });

  it("wraps around to the first technologist after the last one in the list", async () => {
    const { request } = build("audit", { seedSamples: [priorSample("tech-b")] });

    const created = await request(input(2));

    expect(created.assignedTechnologistId).toBe("tech-a");
  });

  it("cycles through technologists via the use-case itself (a → b → a)", async () => {
    // Several deals in "Audit": after one request the deal moves out of the
    // audit stage, so we check the round-robin across different deals
    // instead. The anchor for "next" is whatever the use-case itself saved
    // via the previous request (the save → findLast → pickNext cycle).
    const auditDeal = (id: string): Deal => ({
      id: makeId<"DealId">(id),
      clientId: makeId<"ClientId">("c1") as ClientId,
      title: `Deal ${id}`,
      stage: "audit",
      responsibleManagerId: "manager-owens",
    });
    const deals = new InMemoryDealRepository([
      auditDeal("dr1"),
      auditDeal("dr2"),
      auditDeal("dr3"),
    ]);
    const samples = new InMemorySampleRequestRepository();
    const erp = new StubErpGateway([], [{ productId, freeQuantity: 100, unit: "kg" }], []);
    const notifier = { notify: async () => {} };
    const request = makeRequestSample({
      deals,
      samples,
      erp,
      notifier,
      events: new StoringDealEventRecorder(new InMemoryDealEventRepository()),
      technologistIds,
    });

    const assigned: string[] = [];
    for (const [index, dealKey] of ["dr1", "dr2", "dr3"].entries()) {
      const created = await request(
        input(1, {
          id: makeId<"SampleRequestId">(`sr${index}`),
          dealId: makeId<"DealId">(dealKey),
          requestedAt: `2026-06-21T00:00:0${index}Z`,
        }),
      );
      assigned.push(created.assignedTechnologistId);
    }

    expect(assigned).toEqual(["tech-a", "tech-b", "tech-a"]);
  });

  it("refuses when stock is insufficient and does not move the deal", async () => {
    const { request, deals } = build("audit", { freeQuantity: 1 });

    await expect(request(input(2))).rejects.toBeInstanceOf(InsufficientStockError);
    expect((await deals.findById(dealId))?.stage).toBe("audit");
  });

  it("rejects a request from a stage that isn't eligible", async () => {
    const { request } = build("qualification");
    await expect(request(input(2))).rejects.toBeInstanceOf(SampleRequestStageError);
  });

  it("allows the request when the deal is ALREADY at the testing stage — reserves without moving the stage", async () => {
    const { request, deals, samples, erp, events } = build("testing");

    const created = await request(input(2));

    expect(created.quantity).toBe(2);
    expect(await samples.listByDeal(dealId)).toHaveLength(1);
    // Free stock decreased — the reservation went through.
    expect((await erp.getStockLevel(productId))?.freeQuantity).toBe(38);
    // The stage did NOT change (it already is the testing stage).
    expect((await deals.findById(dealId))?.stage).toBe("testing");
    // The log records the reservation, not a stage change.
    const recorded = await events.listByDeal(dealId);
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.type).toBe("sample_requested");
  });

  it("also assigns a technologist and notifies them at the testing stage", async () => {
    const { request, sent } = build("testing");

    const created = await request(input(2));

    expect(created.assignedTechnologistId).toBe("tech-a");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.recipientId).toBe("tech-a");
  });

  it("throws DealNotFoundError for a nonexistent deal", async () => {
    const { request } = build("audit");
    await expect(
      request({ ...input(2), dealId: makeId<"DealId">("missing") }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });
});
