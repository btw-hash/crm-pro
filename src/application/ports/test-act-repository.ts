import type { DealId } from "@/domain/deal/deal";
import type { TestAct, TestActId } from "@/domain/test-act/test-act";
import type { TechRequestId } from "@/domain/tech-request/tech-request";

export interface TestActRepository {
  save(act: TestAct): Promise<void>;
  findByDealId(dealId: DealId): Promise<TestAct | null>;
  /** List of all acts for a deal (one process can have multiple acts). */
  listByDealId(dealId: DealId): Promise<readonly TestAct[]>;
  /** List of all acts for a technologist request. */
  listByTechRequestId(techRequestId: TechRequestId): Promise<readonly TestAct[]>;
  findById(id: TestActId): Promise<TestAct | null>;
}
