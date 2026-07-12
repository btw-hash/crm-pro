import type { DealId } from "@/domain/deal/deal";
import type { SavedProposal } from "@/domain/proposal/saved-proposal";

/**
 * Storage for saved proposals. One record per process (upsert by dealId) — the
 * current proposal revision assembled at "Proposal negotiation", read at "Completed".
 */
export interface ProposalRepository {
  save(proposal: SavedProposal): Promise<void>;
  findByDealId(dealId: DealId): Promise<SavedProposal | null>;
}
