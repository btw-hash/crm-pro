import type { ClientRepository } from "@/application/ports/client-repository";
import type { Client } from "@/domain/client/client";
import { makeId } from "@/domain/shared/id";

export class ClientValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientValidationError";
  }
}

export interface CreateClientInput {
  readonly name: string;
  readonly city?: string;
  readonly ein?: string;
  readonly responsibleManagerId: string;
}

export type CreateClient = (input: CreateClientInput) => Promise<Client>;

export function makeCreateClient(deps: { clients: ClientRepository }): CreateClient {
  return async function createClientUseCase(input) {
    const name = input.name.trim();
    if (!name) {
      throw new ClientValidationError("Enter the client's name.");
    }
    const client: Client = {
      id: makeId<"ClientId">(crypto.randomUUID()),
      name,
      type: "retail",
      category: "C",
      responsibleManagerId: input.responsibleManagerId,
      city: input.city?.trim() || undefined,
      ein: input.ein?.trim() || undefined,
    };
    await deps.clients.create(client);
    return client;
  };
}
