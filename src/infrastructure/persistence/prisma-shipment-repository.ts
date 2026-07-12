import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientId } from "@/domain/client/client";
import type {
  Shipment,
  ShipmentId,
  ShipmentLine,
  ShipmentStatus,
} from "@/domain/shipment/shipment";
import { prisma } from "./prisma-client";

function toShipment(row: {
  id: string;
  clientId: string;
  managerId: string;
  orderNumber: string;
  address: string;
  lines: unknown;
  driver: string | null;
  scheduledDate: string;
  status: string;
  dealId: string | null;
}): Shipment {
  return {
    id: row.id as ShipmentId,
    clientId: row.clientId as ClientId,
    managerId: row.managerId,
    orderNumber: row.orderNumber,
    address: row.address,
    lines: row.lines as readonly ShipmentLine[],
    driver: row.driver,
    scheduledDate: row.scheduledDate,
    status: row.status as ShipmentStatus,
    dealId: row.dealId,
  };
}

export class PrismaShipmentRepository implements ShipmentRepository {
  async save(shipment: Shipment): Promise<void> {
    await prisma.shipment.upsert({
      where: { id: shipment.id },
      create: {
        id: shipment.id,
        clientId: shipment.clientId,
        managerId: shipment.managerId,
        orderNumber: shipment.orderNumber,
        address: shipment.address,
        lines: shipment.lines as unknown as object[],
        driver: shipment.driver,
        scheduledDate: shipment.scheduledDate,
        status: shipment.status,
        dealId: shipment.dealId,
      },
      update: {
        // Only status (stage progression) and driver assignment are mutated.
        status: shipment.status,
        driver: shipment.driver,
      },
    });
  }

  async findById(id: ShipmentId): Promise<Shipment | null> {
    const row = await prisma.shipment.findUnique({ where: { id } });
    return row ? toShipment(row) : null;
  }

  async findByDealId(dealId: string): Promise<Shipment | null> {
    const row = await prisma.shipment.findFirst({ where: { dealId } });
    return row ? toShipment(row) : null;
  }

  async list(): Promise<readonly Shipment[]> {
    const rows = await prisma.shipment.findMany();
    return rows.map(toShipment);
  }

  async listByManager(managerId: string): Promise<readonly Shipment[]> {
    const rows = await prisma.shipment.findMany({ where: { managerId } });
    return rows.map(toShipment);
  }

  async listByStatus(status: string): Promise<readonly Shipment[]> {
    const rows = await prisma.shipment.findMany({ where: { status } });
    return rows.map(toShipment);
  }
}
