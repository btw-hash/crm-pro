import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import {
  createDeal,
  DealAlreadyDeletedError,
  DealValidationError,
  isDealActive,
  softDeleteDeal,
  updateDealDetails,
} from "./deal";

const clientId = makeId<"ClientId">("c1") as ClientId;

describe("createDeal", () => {
  it("creates a deal at the qualification stage", () => {
    const deal = createDeal({
      id: makeId<"DealId">("d1"),
      clientId,
      title: "New deal",
      responsibleManagerId: "m1",
    });
    expect(deal.stage).toBe("qualification");
    expect(deal.title).toBe("New deal");
    expect(deal.clientId).toBe(clientId);
    expect(deal.responsibleManagerId).toBe("m1");
  });

  it("trims whitespace from the title", () => {
    const deal = createDeal({
      id: makeId<"DealId">("d1"),
      clientId,
      title: "  Deal  ",
      responsibleManagerId: "m1",
    });
    expect(deal.title).toBe("Deal");
  });

  it("throws DealValidationError on an empty title", () => {
    expect(() =>
      createDeal({ id: makeId<"DealId">("d1"), clientId, title: "", responsibleManagerId: "m1" }),
    ).toThrow(DealValidationError);
  });

  it("throws DealValidationError on a whitespace-only title", () => {
    expect(() =>
      createDeal({
        id: makeId<"DealId">("d1"),
        clientId,
        title: "   ",
        responsibleManagerId: "m1",
      }),
    ).toThrow(DealValidationError);
  });

  it("stores the goal if provided", () => {
    const deal = createDeal({
      id: makeId<"DealId">("d1"),
      clientId,
      title: "Deal",
      responsibleManagerId: "m1",
      goal: "order",
    });
    expect(deal.goal).toBe("order");
  });

  it("stores a trimmed comment if provided", () => {
    const deal = createDeal({
      id: makeId<"DealId">("d1"),
      clientId,
      title: "Deal",
      responsibleManagerId: "m1",
      comment: "  important context  ",
    });
    expect(deal.comment).toBe("important context");
  });

  it("doesn't set a comment if it's empty/whitespace", () => {
    const deal = createDeal({
      id: makeId<"DealId">("d1"),
      clientId,
      title: "Deal",
      responsibleManagerId: "m1",
      comment: "   ",
    });
    expect(deal.comment).toBeUndefined();
  });
});

describe("updateDealDetails", () => {
  const base = createDeal({
    id: makeId<"DealId">("d1"),
    clientId,
    title: "Base deal",
    responsibleManagerId: "m1",
  });

  it("changes the title immutably", () => {
    const updated = updateDealDetails(base, { title: "New title" });
    expect(updated.title).toBe("New title");
    expect(base.title).toBe("Base deal");
  });

  it("doesn't change the stage", () => {
    const updated = updateDealDetails(base, { title: "New" });
    expect(updated.stage).toBe("qualification");
  });

  it("changes responsibleManagerId", () => {
    const updated = updateDealDetails(base, { responsibleManagerId: "m2" });
    expect(updated.responsibleManagerId).toBe("m2");
  });

  it("changes clientId", () => {
    const newClientId = makeId<"ClientId">("c2") as ClientId;
    const updated = updateDealDetails(base, { clientId: newClientId });
    expect(updated.clientId).toBe(newClientId);
  });

  it("throws DealValidationError on an empty title in the patch", () => {
    expect(() => updateDealDetails(base, { title: "" })).toThrow(DealValidationError);
  });

  it("throws DealValidationError on a whitespace-only title", () => {
    expect(() => updateDealDetails(base, { title: "   " })).toThrow(DealValidationError);
  });

  it("doesn't touch fields not present in the patch", () => {
    const updated = updateDealDetails(base, { goal: "test" });
    expect(updated.title).toBe(base.title);
    expect(updated.clientId).toBe(base.clientId);
    expect(updated.responsibleManagerId).toBe(base.responsibleManagerId);
    expect(updated.goal).toBe("test");
  });

  it("sets and trims the comment", () => {
    const updated = updateDealDetails(base, { comment: "  note  " });
    expect(updated.comment).toBe("note");
  });

  it("clears the comment on an empty string (undefined, not an empty section)", () => {
    const withComment = updateDealDetails(base, { comment: "existing note" });
    const cleared = updateDealDetails(withComment, { comment: "" });
    expect(cleared.comment).toBeUndefined();
  });
});

describe("softDeleteDeal", () => {
  const base = createDeal({
    id: makeId<"DealId">("d1"),
    clientId,
    title: "Deal",
    responsibleManagerId: "m1",
  });
  const at = "2026-06-29T00:00:00.000Z";

  it("sets deletedAt immutably, without losing fields", () => {
    const deleted = softDeleteDeal(base, at);
    expect(deleted.deletedAt).toBe(at);
    expect(deleted.title).toBe(base.title);
    expect(base.deletedAt).toBeUndefined();
  });

  it("isDealActive: active before deletion, inactive after", () => {
    expect(isDealActive(base)).toBe(true);
    expect(isDealActive(softDeleteDeal(base, at))).toBe(false);
  });

  it("deleting again throws DealAlreadyDeletedError", () => {
    const deleted = softDeleteDeal(base, at);
    expect(() => softDeleteDeal(deleted, at)).toThrow(DealAlreadyDeletedError);
  });
});
