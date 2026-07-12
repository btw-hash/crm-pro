import type { Client, ClientId } from "@/domain/client/client";

export interface ClientRepository {
  findById(id: ClientId): Promise<Client | null>;
  list(): Promise<readonly Client[]>;
  create(client: Client): Promise<void>;
  update(client: Client): Promise<void>;
}
