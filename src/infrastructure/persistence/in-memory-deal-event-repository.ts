import type { DealEventRepository } from "@/application/ports/deal-event-repository";
import type { DealEvent, DealEventId } from "@/domain/deal-event/deal-event";
import type { DealId } from "@/domain/deal/deal";

export class InMemoryDealEventRepository implements DealEventRepository {
  private readonly events = new Map<DealEventId, DealEvent>();

  constructor(seed: readonly DealEvent[] = []) {
    for (const event of seed) {
      this.events.set(event.id, event);
    }
  }

  async save(event: DealEvent): Promise<void> {
    this.events.set(event.id, event);
  }

  async listByDeal(dealId: DealId): Promise<readonly DealEvent[]> {
    return [...this.events.values()]
      .filter((event) => event.dealId === dealId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async list(): Promise<readonly DealEvent[]> {
    return [...this.events.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
