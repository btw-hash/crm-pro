import type { ClientRepository } from "@/application/ports/client-repository";
import type { Client, ClientId } from "@/domain/client/client";
import type { ClientCategory } from "@/domain/client/client-category";
import type { ClientType } from "@/domain/client/client-type";
import { prisma } from "./prisma-client";

function toClient(row: {
  id: string;
  name: string;
  type: string;
  category: string;
  responsibleManagerId: string;
  ein: string | null;
}): Client {
  return {
    id: row.id as ClientId,
    name: row.name,
    type: row.type as ClientType,
    category: row.category as ClientCategory,
    responsibleManagerId: row.responsibleManagerId,
    ...(row.ein != null ? { ein: row.ein } : {}),
  };
}

export class PrismaClientRepository implements ClientRepository {
  async findById(id: ClientId): Promise<Client | null> {
    const row = await prisma.client.findUnique({ where: { id } });
    return row ? toClient(row) : null;
  }

  async list(): Promise<readonly Client[]> {
    const rows = await prisma.client.findMany();
    return rows.map(toClient);
  }

  async create(client: Client): Promise<void> {
    await prisma.client.create({
      data: {
        id: client.id,
        name: client.name,
        type: client.type,
        category: client.category,
        responsibleManagerId: client.responsibleManagerId,
        ein: client.ein ?? null,
      },
    });
  }

  async update(client: Client): Promise<void> {
    await prisma.client.update({
      where: { id: client.id },
      data: {
        name: client.name,
        type: client.type,
        category: client.category,
        responsibleManagerId: client.responsibleManagerId,
        ein: client.ein ?? null,
      },
    });
  }
}
