import type { ContactRepository } from "@/application/ports/contact-repository";
import type { ClientId } from "@/domain/client/client";
import type { Contact } from "@/domain/contact/contact";

export class InMemoryContactRepository implements ContactRepository {
  private readonly items: readonly Contact[];

  constructor(seed: readonly Contact[] = []) {
    this.items = seed;
  }

  async listByClient(clientId: ClientId): Promise<readonly Contact[]> {
    return this.items.filter((contact) => contact.clientId === clientId);
  }
}
