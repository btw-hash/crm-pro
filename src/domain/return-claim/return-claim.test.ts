import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";
import {
  advanceReturn,
  createReturnClaim,
  type CreateReturnClaimInput,
  isReturnTerminal,
  rejectReturn,
  ReturnClaimError,
} from "./return-claim";

const base: CreateReturnClaimInput = {
  id: makeId<"ReturnClaimId">("r1"),
  clientId: makeId<"ClientId">("c1") as ClientId,
  productName: "Noirelle chocolate",
  quantity: 20,
  unit: "kg",
  reason: "defect",
  createdBy: "manager-owens",
  createdAt: "2026-06-24T10:00:00.000Z",
};

describe("createReturnClaim", () => {
  it("creates a return at the 'Return requested' stage", () => {
    const claim = createReturnClaim(base);
    expect(claim.status).toBe("requested");
    expect(claim.reason).toBe("defect");
    expect(claim.unit).toBe("kg");
    expect(claim.dealId).toBeNull();
    expect(claim.comment).toBeNull();
  });

  it("rejects an empty product and a non-positive quantity", () => {
    expect(() => createReturnClaim({ ...base, productName: " " })).toThrow(ReturnClaimError);
    expect(() => createReturnClaim({ ...base, quantity: 0 })).toThrow(ReturnClaimError);
  });
});

describe("advanceReturn", () => {
  it("moves through the process up to 'Documents corrected'", () => {
    let claim = createReturnClaim(base);
    claim = advanceReturn(claim);
    expect(claim.status).toBe("invoice_issued");
    claim = advanceReturn(claim);
    expect(claim.status).toBe("picked_up");
    claim = advanceReturn(claim);
    expect(claim.status).toBe("received");
    claim = advanceReturn(claim);
    expect(claim.status).toBe("corrected");
    expect(isReturnTerminal(claim.status)).toBe(true);
  });

  it("cannot advance past the final stage", () => {
    let claim = createReturnClaim(base);
    for (let i = 0; i < 4; i += 1) claim = advanceReturn(claim);
    expect(() => advanceReturn(claim)).toThrow(ReturnClaimError);
  });

  it("cannot advance a rejected one", () => {
    const claim = rejectReturn(createReturnClaim(base));
    expect(() => advanceReturn(claim)).toThrow(ReturnClaimError);
  });
});

describe("rejectReturn", () => {
  it("rejects only a request (before the invoice)", () => {
    expect(rejectReturn(createReturnClaim(base)).status).toBe("rejected");
    expect(isReturnTerminal("rejected")).toBe(true);
  });

  it("cannot be rejected once the return invoice is already issued", () => {
    const claim = advanceReturn(createReturnClaim(base)); // invoice_issued
    expect(() => rejectReturn(claim)).toThrow(ReturnClaimError);
  });
});
