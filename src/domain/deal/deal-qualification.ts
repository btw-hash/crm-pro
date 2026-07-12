import type { DealId } from "@/domain/deal/deal";
import type { Id } from "@/domain/shared/id";

export type DealQualificationId = Id<"DealQualificationId">;

export interface DealQualification {
  readonly id: DealQualificationId;
  readonly dealId: DealId;
  readonly segment: string | null;
  readonly productionScale: string | null;
  readonly needTask: string | null;
  readonly targetProduct: string | null;
  readonly volumeHint: string | null;
  readonly urgency: string | null;
  readonly decisionMaker: string | null;
  readonly contactPerson: string | null;
  readonly volumePerMonth: string | null;
  readonly revenuePotential: string | null;
  readonly paymentTerms: string | null;
  readonly creditLimitHint: string | null;
  readonly savedAt: string;
}

export interface SaveDealQualificationInput {
  readonly id: DealQualificationId;
  readonly dealId: DealId;
  readonly segment?: string | null;
  readonly productionScale?: string | null;
  readonly needTask?: string | null;
  readonly targetProduct?: string | null;
  readonly volumeHint?: string | null;
  readonly urgency?: string | null;
  readonly decisionMaker?: string | null;
  readonly contactPerson?: string | null;
  readonly volumePerMonth?: string | null;
  readonly revenuePotential?: string | null;
  readonly paymentTerms?: string | null;
  readonly creditLimitHint?: string | null;
  readonly savedAt: string;
}

export class DealQualificationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DealQualificationValidationError";
  }
}

function trimOrNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createDealQualification(input: SaveDealQualificationInput): DealQualification {
  return {
    id: input.id,
    dealId: input.dealId,
    segment: trimOrNull(input.segment),
    productionScale: trimOrNull(input.productionScale),
    needTask: trimOrNull(input.needTask),
    targetProduct: trimOrNull(input.targetProduct),
    volumeHint: trimOrNull(input.volumeHint),
    urgency: trimOrNull(input.urgency),
    decisionMaker: trimOrNull(input.decisionMaker),
    contactPerson: trimOrNull(input.contactPerson),
    volumePerMonth: trimOrNull(input.volumePerMonth),
    revenuePotential: trimOrNull(input.revenuePotential),
    paymentTerms: trimOrNull(input.paymentTerms),
    creditLimitHint: trimOrNull(input.creditLimitHint),
    savedAt: input.savedAt,
  };
}
