import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import { createActivity } from "@/domain/activity/activity";
import { createProductionAudit } from "@/domain/audit/production-audit";
import { createDealEvent } from "@/domain/deal-event/deal-event";
import { createTestAct } from "@/domain/test-act/test-act";
import { makeId } from "@/domain/shared/id";
import type { Viewer } from "@/domain/shared/viewer";
import { InMemoryActivityRepository } from "@/infrastructure/persistence/in-memory-activity-repository";
import { InMemoryAuditRepository } from "@/infrastructure/persistence/in-memory-audit-repository";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemorySampleRequestRepository } from "@/infrastructure/persistence/in-memory-sample-request-repository";
import { InMemoryTestActRepository } from "@/infrastructure/persistence/in-memory-test-act-repository";
import { InMemoryShipmentRepository } from "@/infrastructure/persistence/in-memory-shipment-repository";
import { makeGetDealWorkspace } from "./get-deal-workspace";

const dealId = makeId<"DealId">("d1");
const clientId = makeId<"ClientId">("c1") as ClientId;
const deal: Deal = {
  id: dealId,
  clientId,
  title: "Test Deal",
  stage: "testing",
  responsibleManagerId: "manager-owens",
};

const owner: Viewer = { id: "manager-owens", role: "mop" }; // owns the deal
const otherMop: Viewer = { id: "manager-grant", role: "mop" }; // a different manager
const head: Viewer = { id: "head-1", role: "head" };

function build() {
  const deals = new InMemoryDealRepository([deal]);
  const audits = new InMemoryAuditRepository();
  const testActs = new InMemoryTestActRepository();
  const samples = new InMemorySampleRequestRepository();
  const activities = new InMemoryActivityRepository();
  const events = new InMemoryDealEventRepository();
  const shipments = new InMemoryShipmentRepository();
  return {
    getDealWorkspace: makeGetDealWorkspace({
      deals,
      audits,
      testActs,
      samples,
      activities,
      events,
      shipments,
    }),
    audits,
    testActs,
    samples,
    activities,
    events,
    shipments,
  };
}

describe("getDealWorkspace", () => {
  it("returns null for a deal that doesn't exist", async () => {
    const { getDealWorkspace } = build();

    expect(await getDealWorkspace(makeId<"DealId">("missing"), owner)).toBeNull();
  });

  it("a different manager doesn't see the deal (null), the head of sales does", async () => {
    const { getDealWorkspace } = build();

    expect(await getDealWorkspace(dealId, otherMop)).toBeNull();
    expect((await getDealWorkspace(dealId, head))?.deal.id).toBe(dealId);
  });

  it("returns the deal with an empty audit and act if none have been filed yet", async () => {
    const { getDealWorkspace } = build();

    const workspace = await getDealWorkspace(dealId, owner);

    expect(workspace?.deal.id).toBe(dealId);
    expect(workspace?.audit).toBeNull();
    expect(workspace?.testAct).toBeNull();
  });

  it("pulls in the deal's audit and act once they exist", async () => {
    const { getDealWorkspace, audits, testActs } = build();
    await audits.save(
      createProductionAudit({
        id: makeId<"AuditId">("a1"),
        dealId,
        clientId,
        equipment: ["Miwe rotary oven"],
        createdBy: "tech-1",
        createdAt: "2026-06-21T00:00:00Z",
      }),
    );
    await testActs.save(
      createTestAct({
        id: makeId<"TestActId">("t1"),
        dealId,
        productName: "Coverlux Cover Glaze",
        result: "success",
        confirmedBy: "tech-1",
        confirmedAt: "2026-06-21T00:00:00Z",
      }),
    );

    const workspace = await getDealWorkspace(dealId, owner);

    expect(workspace?.audit?.equipment).toEqual(["Miwe rotary oven"]);
    expect(workspace?.testAct?.productName).toBe("Coverlux Cover Glaze");
  });

  it("returns the activity feed and the 'next step' (nearest open task)", async () => {
    const { getDealWorkspace, activities } = build();
    await activities.save(
      createActivity({
        id: makeId<"ActivityId">("act-1"),
        dealId,
        kind: "note",
        text: "Discussed the test results",
        author: "manager-owens",
        createdAt: "2026-06-21T09:00:00Z",
      }),
    );
    await activities.save(
      createActivity({
        id: makeId<"ActivityId">("act-2"),
        dealId,
        kind: "task",
        text: "Send the proposal",
        author: "manager-owens",
        createdAt: "2026-06-21T10:00:00Z",
        dueDate: "2026-06-24",
      }),
    );

    const workspace = await getDealWorkspace(dealId, owner);

    expect(workspace?.activities).toHaveLength(2);
    expect(workspace?.nextStep?.text).toBe("Send the proposal");
  });

  it("merges activities and system events into a single feed (newest first)", async () => {
    const { getDealWorkspace, activities, events } = build();
    await activities.save(
      createActivity({
        id: makeId<"ActivityId">("act-1"),
        dealId,
        kind: "note",
        text: "Note",
        author: "manager-owens",
        createdAt: "2026-06-20T09:00:00Z",
      }),
    );
    await events.save(
      createDealEvent({
        id: makeId<"DealEventId">("evt-1"),
        dealId,
        type: "stage_changed",
        summary: "Stage: Technologist request → Technologist response",
        actor: "manager-owens",
        createdAt: "2026-06-21T09:00:00Z",
        fromStage: "audit",
        toStage: "testing",
      }),
    );

    const workspace = await getDealWorkspace(dealId, owner);

    expect(workspace?.timeline).toHaveLength(2);
    // Newest first: the event (the 21st) comes before the note (the 20th).
    expect(workspace?.timeline[0]?.source).toBe("event");
    expect(workspace?.timeline[1]?.source).toBe("activity");
  });
});
