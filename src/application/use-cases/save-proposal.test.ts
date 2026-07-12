import { describe, expect, it } from "vitest";
import type { DealRepository } from "@/application/ports/deal-repository";
import type { ProposalRepository } from "@/application/ports/proposal-repository";
import type { Deal, DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import type { SavedProposal, SavedProposalId } from "@/domain/proposal/saved-proposal";
import { DealNotFoundError } from "./advance-deal-stage";
import { makeSaveProposal } from "./save-proposal";

class FakeProposals implements ProposalRepository {
  saved: SavedProposal | null = null;
  async save(proposal: SavedProposal): Promise<void> {
    this.saved = proposal;
  }
  async findByDealId(): Promise<SavedProposal | null> {
    return this.saved;
  }
}

const deals = (has: boolean): DealRepository =>
  ({
    async findById(id: DealId) {
      return has ? ({ id, stage: "quote" } as Deal) : null;
    },
  }) as unknown as DealRepository;

const input = () => ({
  id: "prop1" as SavedProposalId,
  dealId: "d1" as DealId,
  lines: [
    {
      productId: "p1" as ProductId,
      productName: "Cocoa",
      unit: "kg",
      quantity: 1000,
      unitPriceUsd: 2,
    },
  ],
  savedAt: "2026-07-01T10:00:00.000Z",
});

describe("saveProposal", () => {
  it("persists a valid proposal for an existing deal", async () => {
    const proposals = new FakeProposals();
    const saveProposal = makeSaveProposal({ proposals, deals: deals(true) });
    const result = await saveProposal(input());
    expect(result.lines).toHaveLength(1);
    expect(proposals.saved?.dealId).toBe("d1");
  });

  it("throws DealNotFoundError if the deal doesn't exist", async () => {
    const proposals = new FakeProposals();
    const saveProposal = makeSaveProposal({ proposals, deals: deals(false) });
    await expect(saveProposal(input())).rejects.toBeInstanceOf(DealNotFoundError);
    expect(proposals.saved).toBeNull();
  });
});
