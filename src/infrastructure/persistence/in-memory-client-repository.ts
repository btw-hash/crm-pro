import type { ClientRepository } from "@/application/ports/client-repository";
import type { Client, ClientId } from "@/domain/client/client";

export class InMemoryClientRepository implements ClientRepository {
  private clients: Client[];

  constructor(clients: readonly Client[]) {
    this.clients = [...clients];
  }

  async findById(id: ClientId): Promise<Client | null> {
    return this.clients.find((client) => client.id === id) ?? null;
  }

  async list(): Promise<readonly Client[]> {
    return this.clients;
  }

  async create(client: Client): Promise<void> {
    this.clients = [...this.clients, client];
  }

  async update(client: Client): Promise<void> {
    this.clients = this.clients.map((c) => (c.id === client.id ? client : c));
  }
}
