import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import type { ClientId } from "@/domain/client/client";
import {
  advanceShipment,
  cancelShipment,
  isShipmentCancelled,
  ShipmentError,
  type Shipment,
  type ShipmentStatus,
} from "./shipment";

function shipment(status: ShipmentStatus): Shipment {
  return {
    id: makeId<"ShipmentId">("s1"),
    clientId: makeId<"ClientId">("c1") as ClientId,
    managerId: "manager-smith",
    orderNumber: "ORD-2026-0001",
    address: "123 Oak St, Portland, OR",
    lines: [{ productName: "Belcolade", quantity: 2, unit: "bag", weightKg: 50 }],
    driver: null,
    scheduledDate: "2026-06-25",
    status,
    dealId: null,
  };
}

describe("cancelShipment", () => {
  it('moves an undelivered shipment to "cancelled"', () => {
    const cancelled = cancelShipment(shipment("in_warehouse"));
    expect(cancelled.status).toBe("cancelled");
    expect(isShipmentCancelled(cancelled.status)).toBe(true);
  });

  it("a delivered shipment can't be cancelled", () => {
    expect(() => cancelShipment(shipment("delivered"))).toThrow(ShipmentError);
  });

  it("cancelling again is a no-op (same object)", () => {
    const once = cancelShipment(shipment("placed"));
    expect(cancelShipment(once)).toBe(once);
  });

  it("is immutable — doesn't mutate the source", () => {
    const src = shipment("placed");
    cancelShipment(src);
    expect(src.status).toBe("placed");
  });
});

describe("advanceShipment with a cancelled shipment", () => {
  it("a cancelled shipment can't be advanced through the stages (doesn't re-enter the flow)", () => {
    expect(() => advanceShipment(shipment("cancelled"))).toThrow(ShipmentError);
  });
});
