import type { DealListFilter, DealRepository } from "@/application/ports/deal-repository";
import { type Deal, type DealId, isDealActive } from "@/domain/deal/deal";

export class InMemoryDealRepository implements DealRepository {
  private readonly deals: Map<DealId, Deal>;

  constructor(initial: readonly Deal[]) {
    this.deals = new Map(initial.map((deal) => [deal.id, deal] as const));
  }

  async findById(id: DealId): Promise<Deal | null> {
    return this.deals.get(id) ?? null;
  }

  async list(filter?: DealListFilter): Promise<readonly Deal[]> {
    // Soft-deleted (deletedAt) records are excluded from lists/boards/analytics (#397 item 23).
    const all = [...this.deals.values()].filter(isDealActive);
    if (filter?.responsibleManagerId !== undefined) {
      return all.filter((deal) => deal.responsibleManagerId === filter.responsibleManagerId);
    }
    return all;
  }

  async save(deal: Deal): Promise<void> {
    this.deals.set(deal.id, deal);
  }

  async delete(id: DealId): Promise<void> {
    this.deals.delete(id);
  }
}
