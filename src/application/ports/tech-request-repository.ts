import type { DealId } from "@/domain/deal/deal";
import type { TechRequest, TechRequestId } from "@/domain/tech-request/tech-request";

export interface TechRequestRepository {
  save(request: TechRequest): Promise<void>;
  findById(id: TechRequestId): Promise<TechRequest | null>;
  /** Requests in status open (not yet picked up). */
  listOpen(): Promise<readonly TechRequest[]>;
  /** Requests in statuses open + in_progress (the whole active queue). */
  listActive(): Promise<readonly TechRequest[]>;
  /** All requests regardless of status (technologist board + card history). */
  listAll(): Promise<readonly TechRequest[]>;
  listForTechnologist(technologistId: string): Promise<readonly TechRequest[]>;
  listByDeal(dealId: DealId): Promise<readonly TechRequest[]>;
}
