import { describe, expect, it } from "vitest";
import { makeId } from "@/domain/shared/id";
import { createDeal } from "./deal";

function input(type?: "new_client" | "test" | "defect" | "packing") {
  return {
    id: makeId<"DealId">("d1"),
    clientId: makeId<"ClientId">("c1"),
    title: "Process",
    responsibleManagerId: "manager-smith",
    ...(type ? { type } : {}),
  };
}

describe("createDeal — starting stage by process type (#0055)", () => {
  it('type "test" starts directly at the "Tech request" stage', () => {
    const deal = createDeal(input("test"));
    expect(deal.stage).toBe("audit");
    expect(deal.type).toBe("test");
  });

  it('type "new_client" starts from qualification', () => {
    expect(createDeal(input("new_client")).stage).toBe("qualification");
  });

  it("defect/packing start from qualification (tag, route — after demo)", () => {
    expect(createDeal(input("defect")).stage).toBe("qualification");
    expect(createDeal(input("packing")).stage).toBe("qualification");
  });

  it("no type — defaults to new client / qualification", () => {
    const deal = createDeal(input());
    expect(deal.stage).toBe("qualification");
    expect(deal.type).toBe("new_client");
  });
});
