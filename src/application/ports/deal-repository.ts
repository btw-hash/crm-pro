import type { Deal, DealId } from "@/domain/deal/deal";

export interface DealListFilter {
  readonly responsibleManagerId?: string;
}

export interface DealRepository {
  findById(id: DealId): Promise<Deal | null>;
  list(filter?: DealListFilter): Promise<readonly Deal[]>;
  save(deal: Deal): Promise<void>;
  delete(id: DealId): Promise<void>;
}
