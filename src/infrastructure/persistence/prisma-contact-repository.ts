import type { ContactRepository } from "@/application/ports/contact-repository";
import type { ClientId } from "@/domain/client/client";
import type { Contact, ContactId, ContactRole } from "@/domain/contact/contact";
import { prisma } from "./prisma-client";

function toContact(row: {
  id: string;
  clientId: string;
  name: string;
  position: string;
  role: string;
  phone: string | null;
  email: string | null;
}): Contact {
  return {
    id: row.id as ContactId,
    clientId: row.clientId as ClientId,
    name: row.name,
    position: row.position,
    role: row.role as ContactRole,
    ...(row.phone != null ? { phone: row.phone } : {}),
    ...(row.email != null ? { email: row.email } : {}),
  };
}

export class PrismaContactRepository implements ContactRepository {
  async listByClient(clientId: ClientId): Promise<readonly Contact[]> {
    const rows = await prisma.contact.findMany({ where: { clientId } });
    return rows.map(toContact);
  }
}
