import type { QuotaRepository } from "@/application/ports/quota-repository";
import type { Quota } from "@/domain/quota/quota";

export type ListQuotas = (mopId?: string) => Promise<readonly Quota[]>;

export function makeListQuotas(deps: { quotas: QuotaRepository }): ListQuotas {
  return (mopId) => {
    if (mopId !== undefined) {
      return deps.quotas.listByMop(mopId);
    }
    return deps.quotas.listAll();
  };
}
