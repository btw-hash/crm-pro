import { describe, expect, it } from "vitest";
import type { ClientBalance } from "@/domain/client/client-balance";
import type { ClientId } from "@/domain/client/client";
import { Money } from "@/domain/pricing/money";
import { makeId } from "@/domain/shared/id";
import { StubErpGateway } from "@/infrastructure/erp/stub-erp-gateway";
import { makeGetClientBalanceView } from "./get-client-balance-view";

const clientId = makeId<"ClientId">("c1") as ClientId;

function build(balances: readonly ClientBalance[]) {
  return makeGetClientBalanceView({ erp: new StubErpGateway([], [], balances) });
}

describe("getClientBalanceView", () => {
  it("formats debt/limit/available balance and the flag (within limit)", async () => {
    const view = await build([
      { clientId, debt: Money.dollars(30_000), creditLimit: Money.dollars(100_000) },
    ])(clientId);
    expect(view?.isOverLimit).toBe(false);
    expect(view?.availableMinor).toBe(7_000_000); // 70k in minor units
    expect(view?.available).toContain("70");
  });

  it("over the limit → isOverLimit=true, available balance is negative", async () => {
    const view = await build([
      { clientId, debt: Money.dollars(95_000), creditLimit: Money.dollars(50_000) },
    ])(clientId);
    expect(view?.isOverLimit).toBe(true);
    expect(view?.availableMinor).toBe(-4_500_000);
  });

  it("no balance on record → null", async () => {
    expect(await build([])(clientId)).toBeNull();
  });
});
