import type { DealQualification } from "@/domain/deal/deal-qualification";
import type { DealId } from "@/domain/deal/deal";

export interface DealQualificationRepository {
  save(qualification: DealQualification): Promise<void>;
  findByDealId(dealId: DealId): Promise<DealQualification | null>;
}
