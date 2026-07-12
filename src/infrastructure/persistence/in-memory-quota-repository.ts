import type { QuotaRepository } from "@/application/ports/quota-repository";
import type { Quota, QuotaId } from "@/domain/quota/quota";

export class InMemoryQuotaRepository implements QuotaRepository {
  private readonly items = new Map<QuotaId, Quota>();

  constructor(seed: readonly Quota[] = []) {
    for (const quota of seed) {
      this.items.set(quota.id, quota);
    }
  }

  async listByMop(mopId: string): Promise<readonly Quota[]> {
    return [...this.items.values()].filter((q) => q.mopId === mopId);
  }

  async listAll(): Promise<readonly Quota[]> {
    return [...this.items.values()];
  }

  async save(quota: Quota): Promise<void> {
    this.items.set(quota.id, quota);
  }
}
