import type { Quota } from "@/domain/quota/quota";

export interface QuotaRepository {
  listByMop(mopId: string): Promise<readonly Quota[]>;
  listAll(): Promise<readonly Quota[]>;
  save(quota: Quota): Promise<void>;
}
