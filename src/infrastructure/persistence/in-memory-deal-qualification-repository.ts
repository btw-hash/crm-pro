import type { DealQualificationRepository } from "@/application/ports/deal-qualification-repository";
import type { DealQualification } from "@/domain/deal/deal-qualification";
import type { DealId } from "@/domain/deal/deal";

export class InMemoryDealQualificationRepository implements DealQualificationRepository {
  private readonly store = new Map<DealId, DealQualification>();

  async save(qualification: DealQualification): Promise<void> {
    this.store.set(qualification.dealId, qualification);
  }

  async findByDealId(dealId: DealId): Promise<DealQualification | null> {
    return this.store.get(dealId) ?? null;
  }
}
