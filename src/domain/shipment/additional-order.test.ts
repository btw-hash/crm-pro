import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import {
  additionalOrderLinesSummary,
  AdditionalOrderError,
  createAdditionalOrder,
  isSameDayAsParent,
} from "./additional-order";
import type { AdditionalOrderId } from "./additional-order";

const clientId = makeId<"ClientId">("c1") as ClientId;

function validInput() {
  return {
    id: makeId<"AdditionalOrderId">("ao-1") as AdditionalOrderId,
    clientId,
    parentOrderNumber: "ORD-2026-0006",
    lines: [{ productName: "Belcolade chocolate", quantity: 50, unit: "kg" }],
    shipmentDate: "2026-06-25",
    recordedBy: "manager-smith",
    createdAt: "2026-06-24T22:30:00Z",
  };
}

describe("createAdditionalOrder", () => {
  it("creates an add-on request with valid data", () => {
    const order = createAdditionalOrder(validInput());
    expect(order.parentOrderNumber).toBe("ORD-2026-0006");
    expect(order.shipmentDate).toBe("2026-06-25");
    expect(order.lines).toHaveLength(1);
    expect(order.note).toBeNull();
  });

  it("trims whitespace in parentOrderNumber and productName", () => {
    const order = createAdditionalOrder({
      ...validInput(),
      parentOrderNumber: "  ORD-2026-0006  ",
      lines: [{ productName: "  Chocolate  ", quantity: 10, unit: "kg" }],
    });
    expect(order.parentOrderNumber).toBe("ORD-2026-0006");
    expect(order.lines[0]?.productName).toBe("Chocolate");
  });

  it("empty parentOrderNumber → AdditionalOrderError", () => {
    expect(() => createAdditionalOrder({ ...validInput(), parentOrderNumber: "   " })).toThrow(
      AdditionalOrderError,
    );
  });

  it("invalid shipment date → AdditionalOrderError", () => {
    expect(() => createAdditionalOrder({ ...validInput(), shipmentDate: "25.06.2026" })).toThrow(
      AdditionalOrderError,
    );
  });

  it("empty shipment date → AdditionalOrderError", () => {
    expect(() => createAdditionalOrder({ ...validInput(), shipmentDate: "" })).toThrow(
      AdditionalOrderError,
    );
  });

  it("empty line item list → AdditionalOrderError", () => {
    expect(() => createAdditionalOrder({ ...validInput(), lines: [] })).toThrow(
      AdditionalOrderError,
    );
  });

  it("quantity ≤ 0 → AdditionalOrderError", () => {
    expect(() =>
      createAdditionalOrder({
        ...validInput(),
        lines: [{ productName: "Chocolate", quantity: 0, unit: "kg" }],
      }),
    ).toThrow(AdditionalOrderError);
  });

  it("empty line item name → AdditionalOrderError", () => {
    expect(() =>
      createAdditionalOrder({
        ...validInput(),
        lines: [{ productName: "   ", quantity: 10, unit: "kg" }],
      }),
    ).toThrow(AdditionalOrderError);
  });

  it('unit defaults to "unit" if an empty one is passed', () => {
    const order = createAdditionalOrder({
      ...validInput(),
      lines: [{ productName: "Item", quantity: 5, unit: "" }],
    });
    expect(order.lines[0]?.unit).toBe("unit");
  });

  it("note is kept if provided", () => {
    const order = createAdditionalOrder({ ...validInput(), note: "  Urgent  " });
    expect(order.note).toBe("Urgent");
  });

  it("note = null if not provided", () => {
    const order = createAdditionalOrder({ ...validInput(), note: undefined });
    expect(order.note).toBeNull();
  });
});

describe("isSameDayAsParent", () => {
  it("returns true if the dates match", () => {
    const order = createAdditionalOrder(validInput());
    expect(isSameDayAsParent(order, "2026-06-25")).toBe(true);
  });

  it("returns false if the add-on request's date doesn't match the parent's", () => {
    const order = createAdditionalOrder(validInput());
    expect(isSameDayAsParent(order, "2026-06-26")).toBe(false);
  });
});

describe("additionalOrderLinesSummary", () => {
  it("assembles a string from the line items", () => {
    const order = createAdditionalOrder({
      ...validInput(),
      lines: [
        { productName: "Chocolate", quantity: 50, unit: "kg" },
        { productName: "Icing", quantity: 10, unit: "kg" },
      ],
    });
    expect(additionalOrderLinesSummary(order)).toBe("Chocolate — 50 kg; Icing — 10 kg");
  });
});
