import type { SampleRequestRepository } from "@/application/ports/sample-request-repository";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import type { SampleRequest, SampleRequestId } from "@/domain/sample/sample-request";
import { prisma } from "./prisma-client";

function toSampleRequest(row: {
  id: string;
  dealId: string;
  productId: string;
  quantity: number;
  unit: string;
  requestedBy: string;
  assignedTechnologistId: string;
  requestedAt: Date;
}): SampleRequest {
  return {
    id: row.id as SampleRequestId,
    dealId: row.dealId as DealId,
    productId: row.productId as ProductId,
    quantity: row.quantity,
    unit: row.unit,
    requestedBy: row.requestedBy,
    assignedTechnologistId: row.assignedTechnologistId,
    requestedAt: row.requestedAt.toISOString(),
  };
}

export class PrismaSampleRequestRepository implements SampleRequestRepository {
  async save(request: SampleRequest): Promise<void> {
    await prisma.sampleRequest.upsert({
      where: { id: request.id },
      create: {
        id: request.id,
        dealId: request.dealId,
        productId: request.productId,
        quantity: request.quantity,
        unit: request.unit,
        requestedBy: request.requestedBy,
        assignedTechnologistId: request.assignedTechnologistId,
        requestedAt: new Date(request.requestedAt),
      },
      update: {
        quantity: request.quantity,
        unit: request.unit,
        requestedBy: request.requestedBy,
        assignedTechnologistId: request.assignedTechnologistId,
        requestedAt: new Date(request.requestedAt),
      },
    });
  }

  async update(request: SampleRequest): Promise<void> {
    await prisma.sampleRequest.update({
      where: { id: request.id },
      data: {
        quantity: request.quantity,
        unit: request.unit,
        assignedTechnologistId: request.assignedTechnologistId,
      },
    });
  }

  async findById(id: SampleRequestId): Promise<SampleRequest | null> {
    const row = await prisma.sampleRequest.findUnique({ where: { id } });
    return row ? toSampleRequest(row) : null;
  }

  async listByDeal(dealId: DealId): Promise<readonly SampleRequest[]> {
    const rows = await prisma.sampleRequest.findMany({
      where: { dealId },
      orderBy: { requestedAt: "desc" },
    });
    return rows.map(toSampleRequest);
  }

  async findLast(): Promise<SampleRequest | null> {
    const row = await prisma.sampleRequest.findFirst({
      orderBy: { requestedAt: "desc" },
    });
    return row ? toSampleRequest(row) : null;
  }
}
