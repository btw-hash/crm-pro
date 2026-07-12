import type { ClientRepository } from "@/application/ports/client-repository";
import type { Client } from "@/domain/client/client";
import { isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export type ListClients = (viewer: Viewer) => Promise<readonly Client[]>;

/**
 * List of clients with visibility rules applied: a sales manager sees only their own
 * portfolio (where they are the responsible manager), a technologist/head of sales
 * sees all clients (see isOwnerScoped).
 */
export function makeListClients(deps: { clients: ClientRepository }): ListClients {
  return async (viewer) => {
    const all = await deps.clients.list();
    if (!isOwnerScoped(viewer.role)) {
      return all;
    }
    return all.filter((client) => client.responsibleManagerId === viewer.id);
  };
}
