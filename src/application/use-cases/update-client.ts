import type { ClientRepository } from "@/application/ports/client-repository";
import type { Client, ClientId } from "@/domain/client/client";
import { CLIENT_CATEGORIES, type ClientCategory } from "@/domain/client/client-category";
import { CLIENT_TYPES, type ClientType } from "@/domain/client/client-type";
import { ClientValidationError } from "./create-client";

export interface UpdateClientInput {
  readonly id: ClientId;
  readonly name: string;
  readonly type: ClientType;
  readonly category: ClientCategory;
  readonly responsibleManagerId: string;
  readonly ein?: string;
  readonly city?: string;
}

export type UpdateClient = (input: UpdateClientInput) => Promise<Client>;

export function makeUpdateClient(deps: { clients: ClientRepository }): UpdateClient {
  return async function updateClientUseCase(input) {
    const name = input.name.trim();
    if (!name) {
      throw new ClientValidationError("Enter the client's name.");
    }
    if (!CLIENT_TYPES.includes(input.type)) {
      throw new ClientValidationError("Invalid client type.");
    }
    if (!CLIENT_CATEGORIES.includes(input.category)) {
      throw new ClientValidationError("Invalid client category.");
    }
    const existing = await deps.clients.findById(input.id);
    if (!existing) {
      throw new ClientValidationError("Client not found.");
    }
    const updated: Client = {
      ...existing,
      name,
      type: input.type,
      category: input.category,
      responsibleManagerId: input.responsibleManagerId,
      city: input.city?.trim() || undefined,
      ein: input.ein?.trim() || undefined,
    };
    await deps.clients.update(updated);
    return updated;
  };
}
