import { describe, expect, it } from "vitest";
import type { Deal } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemoryNotificationRepository } from "@/infrastructure/persistence/in-memory-notification-repository";
import { StubNotifier } from "@/infrastructure/notification/stub-notifier";
import { ConsoleLogger } from "@/infrastructure/logging/logger";
import { makeAssignDealManager, AssignDealManagerError } from "./assign-deal-manager";

const dealId = makeId<"DealId">("deal-test-1");

function makeDeal(responsibleManagerId: string): Deal {
  return {
    id: dealId,
    clientId: makeId<"ClientId">("client-1"),
    title: "Test deal",
    stage: "qualification",
    responsibleManagerId,
  };
}

describe("assignDealManager", () => {
  it("changes the responsible manager", async () => {
    const deals = new InMemoryDealRepository([makeDeal("manager-old")]);
    const notifications = new InMemoryNotificationRepository();
    const notifier = new StubNotifier(notifications, new ConsoleLogger());
    const useCase = makeAssignDealManager({ deals, notifier });

    await useCase({
      dealId,
      newManagerId: "manager-new",
      actorRole: "head",
      actorId: "head-alexander",
    });

    const updated = await deals.findById(dealId);
    expect(updated?.responsibleManagerId).toBe("manager-new");
  });

  it("creates a notification for the new owner", async () => {
    const deals = new InMemoryDealRepository([makeDeal("manager-old")]);
    const notifications = new InMemoryNotificationRepository();
    const notifier = new StubNotifier(notifications, new ConsoleLogger());
    const useCase = makeAssignDealManager({ deals, notifier });

    await useCase({
      dealId,
      newManagerId: "manager-new",
      actorRole: "head",
      actorId: "head-alexander",
    });

    const list = await notifications.listForRecipient("manager-new");
    expect(list).toHaveLength(1);
    const notif = list[0];
    expect(notif).toBeDefined();
    expect(notif?.dealId).toEqual(dealId);
    expect(notif?.read).toBe(false);
  });

  it("forbids reassignment by a non-head", async () => {
    const deals = new InMemoryDealRepository([makeDeal("manager-old")]);
    const notifications = new InMemoryNotificationRepository();
    const notifier = new StubNotifier(notifications, new ConsoleLogger());
    const useCase = makeAssignDealManager({ deals, notifier });

    await expect(
      useCase({
        dealId,
        newManagerId: "manager-new",
        actorRole: "mop",
        actorId: "manager-old",
      }),
    ).rejects.toBeInstanceOf(AssignDealManagerError);
  });

  it("throws AssignDealManagerError if the deal is not found", async () => {
    const deals = new InMemoryDealRepository([]);
    const notifications = new InMemoryNotificationRepository();
    const notifier = new StubNotifier(notifications, new ConsoleLogger());
    const useCase = makeAssignDealManager({ deals, notifier });

    await expect(
      useCase({
        dealId,
        newManagerId: "manager-new",
        actorRole: "head",
        actorId: "head-alexander",
      }),
    ).rejects.toBeInstanceOf(AssignDealManagerError);
  });

  it("no-op if the owner is already the same", async () => {
    const deals = new InMemoryDealRepository([makeDeal("manager-same")]);
    const notifications = new InMemoryNotificationRepository();
    const notifier = new StubNotifier(notifications, new ConsoleLogger());
    const useCase = makeAssignDealManager({ deals, notifier });

    await useCase({
      dealId,
      newManagerId: "manager-same",
      actorRole: "head",
      actorId: "head-alexander",
    });

    const list = await notifications.listForRecipient("manager-same");
    expect(list).toHaveLength(0);
  });
});
