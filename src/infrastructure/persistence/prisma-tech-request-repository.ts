import type { TechRequestRepository } from "@/application/ports/tech-request-repository";
import type { ClientId } from "@/domain/client/client";
import type { DealId } from "@/domain/deal/deal";
import type { ProductId } from "@/domain/product/product";
import type {
  ConsultFormat,
  DemoLocation,
  TechRequest,
  TechRequestId,
  TechRequestKind,
  TechRequestStatus,
} from "@/domain/tech-request/tech-request";
import { prisma } from "./prisma-client";

type DbRow = {
  id: string;
  dealId: string;
  clientId: string;
  productId: string | null;
  kind: string;
  note: string;
  status: string;
  requestedBy: string;
  assignedTo: string | null;
  createdAt: Date;
  deadline?: string | null;
  consultFormat?: string | null;
  demoLocation?: string | null;
  demoAddress?: string | null;
  demoProducts?: string | null;
  auditFocus?: string | null;
};

function toTechRequest(row: DbRow): TechRequest {
  return {
    id: row.id as TechRequestId,
    dealId: row.dealId as DealId,
    clientId: row.clientId as ClientId,
    productId: row.productId as ProductId | null,
    kind: row.kind as TechRequestKind,
    note: row.note,
    status: row.status as TechRequestStatus,
    requestedBy: row.requestedBy,
    assignedTo: row.assignedTo,
    createdAt: row.createdAt.toISOString(),
    deadline: row.deadline ?? null,
    consultFormat: (row.consultFormat as ConsultFormat) ?? null,
    demoLocation: (row.demoLocation as DemoLocation) ?? null,
    demoAddress: row.demoAddress ?? null,
    demoProducts: row.demoProducts ?? null,
    auditFocus: row.auditFocus ?? null,
  };
}

export class PrismaTechRequestRepository implements TechRequestRepository {
  async save(request: TechRequest): Promise<void> {
    await prisma.techRequest.upsert({
      where: { id: request.id },
      create: {
        id: request.id,
        dealId: request.dealId,
        clientId: request.clientId,
        productId: request.productId,
        kind: request.kind,
        note: request.note,
        status: request.status,
        requestedBy: request.requestedBy,
        assignedTo: request.assignedTo,
        createdAt: new Date(request.createdAt),
        deadline: request.deadline ?? null,
        consultFormat: request.consultFormat ?? null,
        demoLocation: request.demoLocation ?? null,
        demoAddress: request.demoAddress ?? null,
        demoProducts: request.demoProducts ?? null,
        auditFocus: request.auditFocus ?? null,
      },
      update: {
        // Only status (open->in_progress->done) and the assignee (takeInWork) are mutated.
        status: request.status,
        assignedTo: request.assignedTo,
      },
    });
  }

  async findById(id: TechRequestId): Promise<TechRequest | null> {
    const row = await prisma.techRequest.findUnique({ where: { id } });
    return row ? toTechRequest(row) : null;
  }

  async listOpen(): Promise<readonly TechRequest[]> {
    // FIFO queue: oldest on top (like localeCompare ASC in-memory).
    const rows = await prisma.techRequest.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTechRequest);
  }

  async listActive(): Promise<readonly TechRequest[]> {
    const rows = await prisma.techRequest.findMany({
      where: { status: { in: ["open", "in_progress"] } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTechRequest);
  }

  async listAll(): Promise<readonly TechRequest[]> {
    const rows = await prisma.techRequest.findMany({ orderBy: { createdAt: "asc" } });
    return rows.map(toTechRequest);
  }

  async listForTechnologist(technologistId: string): Promise<readonly TechRequest[]> {
    const rows = await prisma.techRequest.findMany({
      where: { assignedTo: technologistId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toTechRequest);
  }

  async listByDeal(dealId: DealId): Promise<readonly TechRequest[]> {
    // Per deal — newest on top (DESC), like in-memory.
    const rows = await prisma.techRequest.findMany({
      where: { dealId },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toTechRequest);
  }
}
