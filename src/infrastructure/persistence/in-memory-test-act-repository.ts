import type { TestActRepository } from "@/application/ports/test-act-repository";
import type { DealId } from "@/domain/deal/deal";
import type { TestAct, TestActId } from "@/domain/test-act/test-act";
import type { TechRequestId } from "@/domain/tech-request/tech-request";

export class InMemoryTestActRepository implements TestActRepository {
  private readonly acts = new Map<TestActId, TestAct>();

  constructor(seed: readonly TestAct[] = []) {
    for (const act of seed) {
      this.acts.set(act.id, act);
    }
  }

  async save(act: TestAct): Promise<void> {
    this.acts.set(act.id, act);
  }

  async findByDealId(dealId: DealId): Promise<TestAct | null> {
    for (const act of this.acts.values()) {
      if (act.dealId === dealId) {
        return act;
      }
    }
    return null;
  }

  async listByDealId(dealId: DealId): Promise<readonly TestAct[]> {
    return [...this.acts.values()]
      .filter((a) => a.dealId === dealId)
      .sort((a, b) => a.confirmedAt.localeCompare(b.confirmedAt));
  }

  async listByTechRequestId(techRequestId: TechRequestId): Promise<readonly TestAct[]> {
    return [...this.acts.values()]
      .filter((a) => a.techRequestId === techRequestId)
      .sort((a, b) => a.confirmedAt.localeCompare(b.confirmedAt));
  }

  async findById(id: TestActId): Promise<TestAct | null> {
    return this.acts.get(id) ?? null;
  }
}
