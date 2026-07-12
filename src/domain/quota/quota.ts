import type { ProductId } from "@/domain/product/product";
import type { Id } from "@/domain/shared/id";

export type QuotaId = Id<"QuotaId">;

/** Quota period: year + quarter number. */
export interface QuotaPeriod {
  readonly year: number;
  readonly quarter: 1 | 2 | 3 | 4;
}

/**
 * Quota — a personal reserve of goods volume against a Manager's sales plan.
 * All volumes are in physical units (kg, pcs, etc. — per the product's unit).
 */
export interface Quota {
  readonly id: QuotaId;
  readonly mopId: string;
  readonly productId: ProductId;
  readonly period: QuotaPeriod;
  /** Planned volume allocated to the Manager for the period. */
  readonly plannedVolume: number;
  /** Volume reserved against open requests. */
  readonly reservedVolume: number;
  /** Volume already sold (shipped). */
  readonly soldVolume: number;
}

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

/** The quota balance still available for reservation. */
export function availableVolume(quota: Quota): number {
  return quota.plannedVolume - quota.reservedVolume - quota.soldVolume;
}

/**
 * Returns a new quota with reservedVolume increased.
 * Throws QuotaError on an invalid qty or if it exceeds the available volume.
 */
export function reserveFromQuota(quota: Quota, qty: number): Quota {
  if (!Number.isFinite(qty) || qty <= 0) {
    throw new QuotaError("The quantity to reserve must be greater than zero");
  }
  const available = availableVolume(quota);
  if (qty > available) {
    throw new QuotaError(
      `Cannot reserve ${qty}: only ${available} available (plan ${quota.plannedVolume} - reserved ${quota.reservedVolume} - sold ${quota.soldVolume})`,
    );
  }
  return { ...quota, reservedVolume: quota.reservedVolume + qty };
}

export interface CreateQuotaInput {
  readonly id: QuotaId;
  readonly mopId: string;
  readonly productId: ProductId;
  readonly period: QuotaPeriod;
  readonly plannedVolume: number;
  readonly reservedVolume?: number;
  readonly soldVolume?: number;
}

export function createQuota(input: CreateQuotaInput): Quota {
  if (!Number.isFinite(input.plannedVolume) || input.plannedVolume < 0) {
    throw new QuotaError("plannedVolume must be a non-negative number");
  }
  const reservedVolume = input.reservedVolume ?? 0;
  const soldVolume = input.soldVolume ?? 0;
  if (reservedVolume < 0 || soldVolume < 0) {
    throw new QuotaError("reservedVolume and soldVolume cannot be negative");
  }
  return {
    id: input.id,
    mopId: input.mopId,
    productId: input.productId,
    period: input.period,
    plannedVolume: input.plannedVolume,
    reservedVolume,
    soldVolume,
  };
}
