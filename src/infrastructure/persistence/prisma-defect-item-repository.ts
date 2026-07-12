import type { DefectItemRepository } from "@/application/ports/defect-item-repository";
import type {
  DefectItem,
  DefectItemId,
  DefectReason,
  DefectStatus,
} from "@/domain/defect/defect-item";
import { prisma } from "./prisma-client";

function toDefectItem(row: {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  reason: string;
  status: string;
  createdBy: string;
  createdAt: Date;
  note: string | null;
}): DefectItem {
  return {
    id: row.id as DefectItemId,
    productName: row.productName,
    quantity: row.quantity,
    unit: row.unit,
    reason: row.reason as DefectReason,
    status: row.status as DefectStatus,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    note: row.note,
  };
}

export class PrismaDefectItemRepository implements DefectItemRepository {
  async save(item: DefectItem): Promise<void> {
    await prisma.defectItem.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        productName: item.productName,
        quantity: item.quantity,
        unit: item.unit,
        reason: item.reason,
        status: item.status,
        createdBy: item.createdBy,
        createdAt: new Date(item.createdAt),
        note: item.note,
      },
      update: {
        status: item.status,
        note: item.note,
      },
    });
  }

  async findById(id: DefectItemId): Promise<DefectItem | null> {
    const row = await prisma.defectItem.findUnique({ where: { id } });
    return row ? toDefectItem(row) : null;
  }

  async list(): Promise<readonly DefectItem[]> {
    const rows = await prisma.defectItem.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toDefectItem);
  }
}
