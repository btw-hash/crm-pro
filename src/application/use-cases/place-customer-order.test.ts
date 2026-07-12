import { describe, expect, it, vi } from "vitest";
import type { ClientBalance } from "@/domain/client/client-balance";
import type { Client, ClientId } from "@/domain/client/client";
import type { Deal } from "@/domain/deal/deal";
import type { IndividualPrice } from "@/domain/pricing/price";
import { Money } from "@/domain/pricing/money";
import type { Product, ProductId } from "@/domain/product/product";
import { makeId } from "@/domain/shared/id";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { InMemoryClientRepository } from "@/infrastructure/persistence/in-memory-client-repository";
import { InMemoryDealEventRepository } from "@/infrastructure/persistence/in-memory-deal-event-repository";
import { InMemoryDealRepository } from "@/infrastructure/persistence/in-memory-deal-repository";
import { InMemoryProductRepository } from "@/infrastructure/persistence/in-memory-product-repository";
import { InMemoryShipmentRepository } from "@/infrastructure/persistence/in-memory-shipment-repository";
import { StoringDealEventRecorder } from "@/infrastructure/persistence/storing-deal-event-recorder";
import { DealNotFoundError } from "./advance-deal-stage";
import {
  CreditLimitExceededError,
  CustomerOrderValidationError,
  DealNotCompletedError,
  makePlaceCustomerOrder,
} from "./place-customer-order";

const clientId = makeId<"ClientId">("c1") as ClientId;
const productId = makeId<"ProductId">("p1") as ProductId;
const wonDealId = makeId<"DealId">("won");
const quoteDealId = makeId<"DealId">("quote");

const wonDeal: Deal = {
  id: wonDealId,
  clientId,
  title: "Won deal",
  stage: "completed",
  outcome: "won",
  responsibleManagerId: "m1",
};
const quoteDeal: Deal = {
  ...wonDeal,
  id: quoteDealId,
  title: "In progress",
  stage: "quote",
  outcome: undefined,
};
// A completed process with no outcome set — the order should still be created (#442 6d:
// outcome is optional, doesn't gate the order).
const doneNoOutcomeId = makeId<"DealId">("done-no-outcome");
const doneNoOutcomeDeal: Deal = {
  ...wonDeal,
  id: doneNoOutcomeId,
  title: "Completed without outcome",
  stage: "completed",
  outcome: undefined,
};

const stubClient: Client = {
  id: clientId,
  name: "Test Client",
  type: "retail",
  category: "A",
  responsibleManagerId: "m1",
  city: "Portland",
};

const stubProduct: Product = {
  id: productId,
  sku: "TST-001",
  name: "Test Product",
  unit: "kg",
};

function buildDeps() {
  const eventRepo = new InMemoryDealEventRepository();
  return {
    deals: new InMemoryDealRepository([wonDeal, quoteDeal, doneNoOutcomeDeal]),
    erp: new StubErpGateway([], [], []),
    shipments: new InMemoryShipmentRepository(),
    clients: new InMemoryClientRepository([stubClient]),
    products: new InMemoryProductRepository([stubProduct]),
    events: new StoringDealEventRecorder(eventRepo),
    eventRepo,
  };
}

function build() {
  const { eventRepo: _er, ...deps } = buildDeps();
  return makePlaceCustomerOrder(deps);
}

const shipmentDate = "2026-07-01";

describe("placeCustomerOrder", () => {
  it("creates an order and returns a number for a won deal", async () => {
    const result = await build()({
      dealId: wonDealId,
      lines: [{ productId, quantity: 500 }],
      shipmentDate,
    });
    expect(result.orderNumber).toMatch(/^STUB-/);
    expect(result.idempotent).toBe(false);
  });

  it("a repeat on the same deal doesn't create a duplicate (idempotency)", async () => {
    const place = build();
    const first = await place({
      dealId: wonDealId,
      lines: [{ productId, quantity: 500 }],
      shipmentDate,
    });
    const second = await place({
      dealId: wonDealId,
      lines: [{ productId, quantity: 500 }],
      shipmentDate,
    });
    expect(second.orderNumber).toBe(first.orderNumber);
    expect(second.idempotent).toBe(true);
  });

  it("process not completed → DealNotCompletedError", async () => {
    await expect(
      build()({ dealId: quoteDealId, lines: [{ productId, quantity: 1 }], shipmentDate }),
    ).rejects.toBeInstanceOf(DealNotCompletedError);
  });

  it("completed process without an outcome → order is created (outcome is optional, #442 6d)", async () => {
    const result = await build()({
      dealId: doneNoOutcomeId,
      lines: [{ productId, quantity: 500 }],
      shipmentDate,
    });
    expect(result.orderNumber).toMatch(/^STUB-/);
  });

  it("empty line list → validation error", async () => {
    await expect(build()({ dealId: wonDealId, lines: [], shipmentDate })).rejects.toBeInstanceOf(
      CustomerOrderValidationError,
    );
  });

  it("quantity <= 0 → validation error", async () => {
    await expect(
      build()({ dealId: wonDealId, lines: [{ productId, quantity: 0 }], shipmentDate }),
    ).rejects.toBeInstanceOf(CustomerOrderValidationError);
  });

  it("no shipment date → validation error", async () => {
    await expect(
      build()({ dealId: wonDealId, lines: [{ productId, quantity: 1 }], shipmentDate: "" }),
    ).rejects.toBeInstanceOf(CustomerOrderValidationError);
  });

  it("malformed shipment date → validation error", async () => {
    await expect(
      build()({
        dealId: wonDealId,
        lines: [{ productId, quantity: 1 }],
        shipmentDate: "01.07.2026",
      }),
    ).rejects.toBeInstanceOf(CustomerOrderValidationError);
  });

  it("non-existent deal → DealNotFoundError", async () => {
    await expect(
      build()({
        dealId: makeId<"DealId">("ghost"),
        lines: [{ productId, quantity: 1 }],
        shipmentDate,
      }),
    ).rejects.toBeInstanceOf(DealNotFoundError);
  });

  describe("credit limit", () => {
    // price 100 $/unit; available balance = limit 100k − debt 30k = 70k
    const price: IndividualPrice = { clientId, productId, price: Money.dollars(100) };
    const balance: ClientBalance = {
      clientId,
      debt: Money.dollars(30_000),
      creditLimit: Money.dollars(100_000),
    };
    const logger = { warn: vi.fn() };
    function buildCredit() {
      const deps = buildDeps();
      return makePlaceCustomerOrder({
        ...deps,
        erp: new StubErpGateway([price], [], [balance]),
        logger,
      });
    }

    it("within the limit (50k of 70k) → order is created", async () => {
      const result = await buildCredit()({
        dealId: wonDealId,
        lines: [{ productId, quantity: 500 }], // 500×100 = 50k
        shipmentDate,
      });
      expect(result.orderNumber).toMatch(/^STUB-/);
    });

    it("over the limit (80k > 70k) → CreditLimitExceededError, order is blocked", async () => {
      await expect(
        buildCredit()({
          dealId: wonDealId,
          lines: [{ productId, quantity: 800 }], // 800×100 = 80k
          shipmentDate,
        }),
      ).rejects.toBeInstanceOf(CreditLimitExceededError);
    });

    it("over the limit + allowOverLimit → order goes through and the override is logged", async () => {
      logger.warn.mockClear();
      const result = await buildCredit()({
        dealId: wonDealId,
        lines: [{ productId, quantity: 800 }],
        shipmentDate,
        allowOverLimit: true,
      });
      expect(result.orderNumber).toMatch(/^STUB-/);
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it("no price for the line → total can't be determined, limit isn't checked", async () => {
      const deps = buildDeps();
      const place = makePlaceCustomerOrder({
        ...deps,
        erp: new StubErpGateway([], [], [balance]), // balance exists, no price
      });
      const result = await place({
        dealId: wonDealId,
        lines: [{ productId, quantity: 99_999 }],
        shipmentDate,
      });
      expect(result.orderNumber).toMatch(/^STUB-/);
    });
  });

  describe("shipment creation", () => {
    it("after placing the order, a Shipment is created with dealId and status placed", async () => {
      const { shipments, ...rest } = buildDeps();
      const place = makePlaceCustomerOrder({ shipments, ...rest });
      await place({
        dealId: wonDealId,
        lines: [{ productId, quantity: 500 }],
        shipmentDate,
        actorId: "m1",
      });
      const shipment = await shipments.findByDealId(wonDealId);
      expect(shipment).not.toBeNull();
      expect(shipment?.dealId).toBe(wonDealId);
      expect(shipment?.status).toBe("placed");
      expect(shipment?.managerId).toBe("m1");
    });

    it("an idempotent repeat doesn't create a second Shipment", async () => {
      const { shipments, ...rest } = buildDeps();
      const place = makePlaceCustomerOrder({ shipments, ...rest });
      await place({ dealId: wonDealId, lines: [{ productId, quantity: 500 }], shipmentDate });
      await place({ dealId: wonDealId, lines: [{ productId, quantity: 500 }], shipmentDate });
      const all = await shipments.list();
      expect(all.filter((s) => s.dealId === wonDealId)).toHaveLength(1);
    });

    it("after placing the order, a DealEvent order_placed is recorded", async () => {
      const { eventRepo, ...rest } = buildDeps();
      const place = makePlaceCustomerOrder({
        ...rest,
        events: new StoringDealEventRecorder(eventRepo),
      });
      await place({ dealId: wonDealId, lines: [{ productId, quantity: 100 }], shipmentDate });
      const events = await eventRepo.listByDeal(wonDealId);
      expect(events.some((e) => e.type === "order_placed")).toBe(true);
    });
  });
});
