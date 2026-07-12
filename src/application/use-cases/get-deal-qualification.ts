import type { DealQualificationRepository } from "@/application/ports/deal-qualification-repository";
import type { DealQualification } from "@/domain/deal/deal-qualification";
import type { DealId } from "@/domain/deal/deal";

export type GetDealQualificationUseCase = (dealId: DealId) => Promise<DealQualification | null>;

export function makeGetDealQualification(deps: {
  qualifications: DealQualificationRepository;
}): GetDealQualificationUseCase {
  return function getDealQualification(dealId) {
    return deps.qualifications.findByDealId(dealId);
  };
}
