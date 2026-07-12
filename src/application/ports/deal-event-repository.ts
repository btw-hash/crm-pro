import type { DealEvent } from "@/domain/deal-event/deal-event";
import type { DealId } from "@/domain/deal/deal";

export interface DealEventRepository {
  save(event: DealEvent): Promise<void>;
  /** Events for a deal, newest first. */
  listByDeal(dealId: DealId): Promise<readonly DealEvent[]>;
  /** All events — for pipeline analytics aggregates. */
  list(): Promise<readonly DealEvent[]>;
}
