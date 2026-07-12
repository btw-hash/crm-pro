import type { PackingRequestRepository } from "@/application/ports/packing-request-repository";
import type {
  PackingRequest,
  PackingRequestId,
  PackingStatus,
} from "@/domain/packing/packing-request";
import type { ClientId } from "@/domain/client/client";
import { prisma } from "./prisma-client";

function toPackingRequest(row: {
  id: string;
  clientId: string | null;
  productName: string;
  sourcePack: string;
  targetPack: string;
  quantity: number;
  unit: string;
  status: string;
  requestedBy: string;
  createdAt: Date;
  note: string | null;
}): PackingRequest {
  return {
    id: row.id as PackingRequestId,
    clientId: row.clientId as ClientId | null,
    productName: row.productName,
    sourcePack: row.sourcePack,
    targetPack: row.targetPack,
    quantity: row.quantity,
    unit: row.unit,
    status: row.status as PackingStatus,
    requestedBy: row.requestedBy,
    createdAt: row.createdAt.toISOString(),
    note: row.note,
  };
}

export class PrismaPackingRequestRepository implements PackingRequestRepository {
  async save(request: PackingRequest): Promise<void> {
    await prisma.packingRequest.upsert({
      where: { id: request.id },
      create: {
        id: request.id,
        clientId: request.clientId,
        productName: request.productName,
        sourcePack: request.sourcePack,
        targetPack: request.targetPack,
        quantity: request.quantity,
        unit: request.unit,
        status: request.status,
        requestedBy: request.requestedBy,
        createdAt: new Date(request.createdAt),
        note: request.note,
      },
      update: {
        status: request.status,
        note: request.note,
      },
    });
  }

  async findById(id: PackingRequestId): Promise<PackingRequest | null> {
    const row = await prisma.packingRequest.findUnique({ where: { id } });
    return row ? toPackingRequest(row) : null;
  }

  async list(): Promise<readonly PackingRequest[]> {
    const rows = await prisma.packingRequest.findMany({
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toPackingRequest);
  }
}
