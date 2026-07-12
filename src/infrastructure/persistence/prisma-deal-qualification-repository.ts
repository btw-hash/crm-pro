import type { DealQualificationRepository } from "@/application/ports/deal-qualification-repository";
import type { DealQualification, DealQualificationId } from "@/domain/deal/deal-qualification";
import type { DealId } from "@/domain/deal/deal";
import { prisma } from "./prisma-client";

function toQualification(row: {
  id: string;
  dealId: string;
  segment: string | null;
  productionScale: string | null;
  needTask: string | null;
  targetProduct: string | null;
  volumeHint: string | null;
  urgency: string | null;
  decisionMaker: string | null;
  contactPerson: string | null;
  volumePerMonth: string | null;
  revenuePotential: string | null;
  paymentTerms: string | null;
  creditLimitHint: string | null;
  savedAt: Date;
}): DealQualification {
  return {
    id: row.id as DealQualificationId,
    dealId: row.dealId as DealId,
    segment: row.segment,
    productionScale: row.productionScale,
    needTask: row.needTask,
    targetProduct: row.targetProduct,
    volumeHint: row.volumeHint,
    urgency: row.urgency,
    decisionMaker: row.decisionMaker,
    contactPerson: row.contactPerson,
    volumePerMonth: row.volumePerMonth,
    revenuePotential: row.revenuePotential,
    paymentTerms: row.paymentTerms,
    creditLimitHint: row.creditLimitHint,
    savedAt: row.savedAt.toISOString(),
  };
}

export class PrismaDealQualificationRepository implements DealQualificationRepository {
  async save(qualification: DealQualification): Promise<void> {
    await prisma.dealQualification.upsert({
      where: { dealId: qualification.dealId },
      create: {
        id: qualification.id,
        dealId: qualification.dealId,
        segment: qualification.segment,
        productionScale: qualification.productionScale,
        needTask: qualification.needTask,
        targetProduct: qualification.targetProduct,
        volumeHint: qualification.volumeHint,
        urgency: qualification.urgency,
        decisionMaker: qualification.decisionMaker,
        contactPerson: qualification.contactPerson,
        volumePerMonth: qualification.volumePerMonth,
        revenuePotential: qualification.revenuePotential,
        paymentTerms: qualification.paymentTerms,
        creditLimitHint: qualification.creditLimitHint,
        savedAt: new Date(qualification.savedAt),
      },
      update: {
        segment: qualification.segment,
        productionScale: qualification.productionScale,
        needTask: qualification.needTask,
        targetProduct: qualification.targetProduct,
        volumeHint: qualification.volumeHint,
        urgency: qualification.urgency,
        decisionMaker: qualification.decisionMaker,
        contactPerson: qualification.contactPerson,
        volumePerMonth: qualification.volumePerMonth,
        revenuePotential: qualification.revenuePotential,
        paymentTerms: qualification.paymentTerms,
        creditLimitHint: qualification.creditLimitHint,
        savedAt: new Date(qualification.savedAt),
      },
    });
  }

  async findByDealId(dealId: DealId): Promise<DealQualification | null> {
    const row = await prisma.dealQualification.findUnique({ where: { dealId } });
    return row ? toQualification(row) : null;
  }
}
