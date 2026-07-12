import { describe, expect, it } from "vitest";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import {
  createSavedProposal,
  isProposalStatus,
  proposalGrandTotalUsd,
  proposalLineTotalUsd,
  SavedProposalValidationError,
  type SavedProposalId,
  type SavedProposalLine,
} from "./saved-proposal";

const line = (over: Partial<SavedProposalLine> = {}): SavedProposalLine => ({
  productId: "p1" as ProductId,
  productName: "Cocoa powder",
  unit: "kg",
  quantity: 1000,
  unitPriceUsd: 1.5,
  ...over,
});

const baseInput = () => ({
  id: "prop1" as SavedProposalId,
  dealId: "d1" as DealId,
  clientId: "c1" as ClientId,
  lines: [line()],
  savedAt: "2026-07-01T10:00:00.000Z",
});

describe("createSavedProposal", () => {
  it("builds a proposal with default values (revision=1, status=draft, empty prose)", () => {
    const proposal = createSavedProposal(baseInput());
    expect(proposal.revision).toBe(1);
    expect(proposal.status).toBe("draft");
    expect(proposal.prose).toBe("");
    expect(proposal.lines).toHaveLength(1);
    expect(proposal.clientId).toBe("c1");
  });

  it("keeps the provided status, revision and text", () => {
    const proposal = createSavedProposal({
      ...baseInput(),
      revision: 3,
      status: "sent",
      prose: "Hello!",
    });
    expect(proposal.revision).toBe(3);
    expect(proposal.status).toBe("sent");
    expect(proposal.prose).toBe("Hello!");
  });

  it("rejects a proposal with no line items", () => {
    expect(() => createSavedProposal({ ...baseInput(), lines: [] })).toThrow(
      SavedProposalValidationError,
    );
  });

  it("rejects a zero/negative quantity", () => {
    expect(() => createSavedProposal({ ...baseInput(), lines: [line({ quantity: 0 })] })).toThrow(
      SavedProposalValidationError,
    );
  });

  it("rejects a negative price", () => {
    expect(() =>
      createSavedProposal({ ...baseInput(), lines: [line({ unitPriceUsd: -1 })] }),
    ).toThrow(SavedProposalValidationError);
  });

  it("allows a zero price (price not set in the ERP)", () => {
    const proposal = createSavedProposal({ ...baseInput(), lines: [line({ unitPriceUsd: 0 })] });
    expect(proposal.lines[0]?.unitPriceUsd).toBe(0);
  });

  it("rejects a revision < 1", () => {
    expect(() => createSavedProposal({ ...baseInput(), revision: 0 })).toThrow(
      SavedProposalValidationError,
    );
  });
});

describe("proposal totals", () => {
  it("line total = price × quantity", () => {
    expect(proposalLineTotalUsd(line({ quantity: 1000, unitPriceUsd: 1.5 }))).toBe(1500);
  });

  it("grand total = sum across line items", () => {
    const total = proposalGrandTotalUsd([
      line({ quantity: 1000, unitPriceUsd: 1.5 }),
      line({ quantity: 200, unitPriceUsd: 5.5 }),
    ]);
    expect(total).toBe(1500 + 1100);
  });
});

describe("isProposalStatus", () => {
  it("recognizes valid statuses", () => {
    expect(isProposalStatus("draft")).toBe(true);
    expect(isProposalStatus("sent")).toBe(true);
    expect(isProposalStatus("approved")).toBe(true);
    expect(isProposalStatus("declined")).toBe(true);
  });
  it("rejects garbage", () => {
    expect(isProposalStatus("whatever")).toBe(false);
  });
});
