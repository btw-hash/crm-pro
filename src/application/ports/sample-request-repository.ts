import type { DealId } from "@/domain/deal/deal";
import type { SampleRequest, SampleRequestId } from "@/domain/sample/sample-request";

export interface SampleRequestRepository {
  save(request: SampleRequest): Promise<void>;
  update(request: SampleRequest): Promise<void>;
  findById(id: SampleRequestId): Promise<SampleRequest | null>;
  /** Sample requests for a deal, newest first. */
  listByDeal(dealId: DealId): Promise<readonly SampleRequest[]>;
  /**
   * The most recent (by request time) sample request across all deals, or null if
   * there are none. Needed for round-robin routing: the "next technologist" is
   * computed from it (#6).
   */
  findLast(): Promise<SampleRequest | null>;
}
