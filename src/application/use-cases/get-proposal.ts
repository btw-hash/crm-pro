import type { ProposalRepository } from "@/application/ports/proposal-repository";
import type { DealId } from "@/domain/deal/deal";
import type { SavedProposal } from "@/domain/proposal/saved-proposal";

export type GetProposalUseCase = (dealId: DealId) => Promise<SavedProposal | null>;

/** Returns the current saved proposal for the deal (or null). */
export function makeGetProposal(deps: { proposals: ProposalRepository }): GetProposalUseCase {
  return async function getProposal(dealId) {
    return deps.proposals.findByDealId(dealId);
  };
}
