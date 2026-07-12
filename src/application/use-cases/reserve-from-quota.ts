import type { QuotaRepository } from "@/application/ports/quota-repository";
import { reserveFromQuota as domainReserve, type QuotaId } from "@/domain/quota/quota";

export class QuotaNotFoundError extends Error {
  constructor(readonly quotaId: QuotaId) {
    super(`Quota ${quotaId} not found`);
    this.name = "QuotaNotFoundError";
  }
}

export class QuotaOwnershipError extends Error {
  constructor(
    readonly quotaId: QuotaId,
    readonly requestedBy: string,
  ) {
    super(`Quota ${quotaId} belongs to another manager`);
    this.name = "QuotaOwnershipError";
  }
}

export interface ReserveFromQuotaInput {
  readonly quotaId: QuotaId;
  readonly qty: number;
  readonly requestedBy: string;
}

export type ReserveFromQuota = (input: ReserveFromQuotaInput) => Promise<void>;

export function makeReserveFromQuota(deps: { quotas: QuotaRepository }): ReserveFromQuota {
  return async (input) => {
    const all = await deps.quotas.listAll();
    const quota = all.find((q) => q.id === input.quotaId);
    if (!quota) {
      throw new QuotaNotFoundError(input.quotaId);
    }
    if (quota.mopId !== input.requestedBy) {
      throw new QuotaOwnershipError(input.quotaId, input.requestedBy);
    }
    const updated = domainReserve(quota, input.qty);
    await deps.quotas.save(updated);
  };
}
