import type { QuotaRepository } from "@/application/ports/quota-repository";
import type { Quota, QuotaId } from "@/domain/quota/quota";
import type { ProductId } from "@/domain/product/product";
import { prisma } from "./prisma-client";

function toQuota(row: {
  id: string;
  mopId: string;
  productId: string;
  periodYear: number;
  periodQuarter: number;
  plannedVolume: number;
  reservedVolume: number;
  soldVolume: number;
}): Quota {
  return {
    id: row.id as QuotaId,
    mopId: row.mopId,
    productId: row.productId as ProductId,
    period: {
      year: row.periodYear,
      quarter: row.periodQuarter as 1 | 2 | 3 | 4,
    },
    plannedVolume: row.plannedVolume,
    reservedVolume: row.reservedVolume,
    soldVolume: row.soldVolume,
  };
}

export class PrismaQuotaRepository implements QuotaRepository {
  async listByMop(mopId: string): Promise<readonly Quota[]> {
    const rows = await prisma.quota.findMany({ where: { mopId } });
    return rows.map(toQuota);
  }

  async listAll(): Promise<readonly Quota[]> {
    const rows = await prisma.quota.findMany();
    return rows.map(toQuota);
  }

  async save(quota: Quota): Promise<void> {
    await prisma.quota.upsert({
      where: { id: quota.id },
      create: {
        id: quota.id,
        mopId: quota.mopId,
        productId: quota.productId,
        periodYear: quota.period.year,
        periodQuarter: quota.period.quarter,
        plannedVolume: quota.plannedVolume,
        reservedVolume: quota.reservedVolume,
        soldVolume: quota.soldVolume,
      },
      update: {
        plannedVolume: quota.plannedVolume,
        reservedVolume: quota.reservedVolume,
        soldVolume: quota.soldVolume,
      },
    });
  }
}
