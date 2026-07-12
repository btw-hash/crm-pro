import type { ProposalRepository } from "@/application/ports/proposal-repository";
import type { DealId } from "@/domain/deal/deal";
import type { SavedProposal } from "@/domain/proposal/saved-proposal";

export class InMemoryProposalRepository implements ProposalRepository {
  private readonly store = new Map<DealId, SavedProposal>();

  async save(proposal: SavedProposal): Promise<void> {
    this.store.set(proposal.dealId, proposal);
  }

  async findByDealId(dealId: DealId): Promise<SavedProposal | null> {
    return this.store.get(dealId) ?? null;
  }
}
