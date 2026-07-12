import type { TestActRepository } from "@/application/ports/test-act-repository";
import type { DealId } from "@/domain/deal/deal";
import type { TestAct, TestActId, TestActKind, TestActResult } from "@/domain/test-act/test-act";
import type { TechRequestId } from "@/domain/tech-request/tech-request";
import { prisma } from "./prisma-client";

function toTestAct(row: {
  id: string;
  dealId: string;
  techRequestId?: string | null;
  actKind?: string | null;
  clientName: string | null;
  equipment: string | null;
  productName: string | null;
  dosage: string | null;
  processParams: string | null;
  recommendation?: string | null;
  auditChecked?: string | null;
  auditRemarks?: string | null;
  auditRecommendation?: string | null;
  result: string;
  comment: string | null;
  confirmedBy: string;
  confirmedAt: Date;
  sentAt?: Date | null;
}): TestAct {
  return {
    id: row.id as TestActId,
    dealId: row.dealId as DealId,
    techRequestId: (row.techRequestId as TechRequestId | null) ?? null,
    actKind: ((row.actKind as TestActKind | null) ?? "workup") as TestActKind,
    clientName: row.clientName,
    equipment: row.equipment,
    productName: row.productName,
    dosage: row.dosage,
    processParams: row.processParams,
    recommendation: row.recommendation ?? null,
    auditChecked: row.auditChecked ?? null,
    auditRemarks: row.auditRemarks ?? null,
    auditRecommendation: row.auditRecommendation ?? null,
    result: row.result as TestActResult,
    comment: row.comment,
    confirmedBy: row.confirmedBy,
    confirmedAt: row.confirmedAt.toISOString(),
    sentAt: row.sentAt ? row.sentAt.toISOString() : null,
  };
}

export class PrismaTestActRepository implements TestActRepository {
  async save(act: TestAct): Promise<void> {
    const data = {
      dealId: act.dealId,
      techRequestId: act.techRequestId ?? null,
      actKind: act.actKind,
      clientName: act.clientName,
      equipment: act.equipment,
      productName: act.productName,
      dosage: act.dosage,
      processParams: act.processParams,
      recommendation: act.recommendation,
      auditChecked: act.auditChecked,
      auditRemarks: act.auditRemarks,
      auditRecommendation: act.auditRecommendation,
      result: act.result,
      comment: act.comment,
      confirmedBy: act.confirmedBy,
      confirmedAt: new Date(act.confirmedAt),
      sentAt: act.sentAt ? new Date(act.sentAt) : null,
    };
    await prisma.testAct.upsert({
      where: { id: act.id },
      create: { id: act.id, ...data },
      update: data,
    });
  }

  async findByDealId(dealId: DealId): Promise<TestAct | null> {
    const row = await prisma.testAct.findFirst({
      where: { dealId },
      orderBy: { confirmedAt: "asc" },
    });
    return row ? toTestAct(row) : null;
  }

  async listByDealId(dealId: DealId): Promise<readonly TestAct[]> {
    const rows = await prisma.testAct.findMany({
      where: { dealId },
      orderBy: { confirmedAt: "asc" },
    });
    return rows.map(toTestAct);
  }

  async listByTechRequestId(techRequestId: TechRequestId): Promise<readonly TestAct[]> {
    const rows = await prisma.testAct.findMany({
      where: { techRequestId },
      orderBy: { confirmedAt: "asc" },
    });
    return rows.map(toTestAct);
  }

  async findById(id: TestActId): Promise<TestAct | null> {
    const row = await prisma.testAct.findUnique({ where: { id } });
    return row ? toTestAct(row) : null;
  }
}
