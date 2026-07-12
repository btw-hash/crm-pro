import type { DealRepository } from "@/application/ports/deal-repository";
import type { ProposalRepository } from "@/application/ports/proposal-repository";
import {
  createSavedProposal,
  type SavedProposal,
  type SaveProposalInput,
} from "@/domain/proposal/saved-proposal";
import { DealNotFoundError } from "./advance-deal-stage";

export type SaveProposalUseCase = (input: SaveProposalInput) => Promise<SavedProposal>;

/**
 * Saves a proposal for the deal (upsert by dealId). Checks that the deal
 * exists, validates the line items in the domain layer (createSavedProposal),
 * and persists it.
 */
export function makeSaveProposal(deps: {
  proposals: ProposalRepository;
  deals: DealRepository;
}): SaveProposalUseCase {
  return async function saveProposal(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    const proposal = createSavedProposal(input);
    await deps.proposals.save(proposal);
    return proposal;
  };
}
