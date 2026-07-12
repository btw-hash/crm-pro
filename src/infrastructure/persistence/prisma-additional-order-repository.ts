import type { AdditionalOrderRepository } from "@/application/ports/additional-order-repository";
import type { ClientId } from "@/domain/client/client";
import type {
  AdditionalOrder,
  AdditionalOrderId,
  AdditionalOrderLine,
} from "@/domain/shipment/additional-order";
import { prisma } from "./prisma-client";

function toAdditionalOrder(row: {
  id: string;
  clientId: string;
  parentOrderNumber: string;
  lines: unknown;
  shipmentDate: string;
  recordedBy: string;
  createdAt: Date;
  note: string | null;
}): AdditionalOrder {
  return {
    id: row.id as AdditionalOrderId,
    clientId: row.clientId as ClientId,
    parentOrderNumber: row.parentOrderNumber,
    lines: row.lines as readonly AdditionalOrderLine[],
    shipmentDate: row.shipmentDate,
    recordedBy: row.recordedBy,
    createdAt: row.createdAt.toISOString(),
    note: row.note,
  };
}

export class PrismaAdditionalOrderRepository implements AdditionalOrderRepository {
  async save(order: AdditionalOrder): Promise<void> {
    await prisma.additionalOrder.upsert({
      where: { id: order.id },
      create: {
        id: order.id,
        clientId: order.clientId,
        parentOrderNumber: order.parentOrderNumber,
        lines: order.lines as unknown as object[],
        shipmentDate: order.shipmentDate,
        recordedBy: order.recordedBy,
        createdAt: new Date(order.createdAt),
        note: order.note,
      },
      update: {
        clientId: order.clientId,
        parentOrderNumber: order.parentOrderNumber,
        lines: order.lines as unknown as object[],
        shipmentDate: order.shipmentDate,
        recordedBy: order.recordedBy,
        note: order.note,
      },
    });
  }

  async findById(id: AdditionalOrderId): Promise<AdditionalOrder | null> {
    const row = await prisma.additionalOrder.findUnique({ where: { id } });
    return row ? toAdditionalOrder(row) : null;
  }

  async listByDate(shipmentDate: string): Promise<readonly AdditionalOrder[]> {
    const rows = await prisma.additionalOrder.findMany({
      where: { shipmentDate },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toAdditionalOrder);
  }

  async listByParent(parentOrderNumber: string): Promise<readonly AdditionalOrder[]> {
    const rows = await prisma.additionalOrder.findMany({
      where: { parentOrderNumber },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toAdditionalOrder);
  }
}
