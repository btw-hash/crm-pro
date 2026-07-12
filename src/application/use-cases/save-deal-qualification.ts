import type { DealQualificationRepository } from "@/application/ports/deal-qualification-repository";
import type { DealRepository } from "@/application/ports/deal-repository";
import {
  createDealQualification,
  type DealQualification,
  type SaveDealQualificationInput,
} from "@/domain/deal/deal-qualification";
import { DealNotFoundError } from "./advance-deal-stage";

export type SaveDealQualificationUseCase = (
  input: SaveDealQualificationInput,
) => Promise<DealQualification>;

export function makeSaveDealQualification(deps: {
  qualifications: DealQualificationRepository;
  deals: DealRepository;
}): SaveDealQualificationUseCase {
  return async function saveDealQualification(input) {
    const deal = await deps.deals.findById(input.dealId);
    if (!deal) {
      throw new DealNotFoundError(input.dealId);
    }
    const qualification = createDealQualification(input);
    await deps.qualifications.save(qualification);
    return qualification;
  };
}
