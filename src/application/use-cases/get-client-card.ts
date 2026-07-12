import type { ClientCard, ClientCardLine } from "@/application/dto/client-card";
import type { ClientRepository } from "@/application/ports/client-repository";
import type { ContactRepository } from "@/application/ports/contact-repository";
import type { ErpGateway } from "@/application/ports/erp-gateway";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ClientId } from "@/domain/client/client";
import { canSeeMargin, isOwnerScoped } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export class ClientNotFoundError extends Error {
  constructor(readonly clientId: ClientId) {
    super(`Client not found: ${clientId}`);
    this.name = "ClientNotFoundError";
  }
}

export interface GetClientCardDeps {
  readonly clients: ClientRepository;
  readonly contacts: ContactRepository;
  readonly products: ProductRepository;
  readonly erp: ErpGateway;
}

export type GetClientCard = (clientId: ClientId, viewer: Viewer) => Promise<ClientCard>;

/**
 * Assembles the client card: client data + stock levels across the whole
 * catalog, and for roles with margin access — individual prices too.
 * Stock/prices come from the ERP via ErpGateway.
 *
 * Access: a Manager only sees their own clients — another manager's client
 * is "not found" for them (no leak of the fact that it exists). Head of
 * Sales/technologist see any client.
 *
 * If the role can't see margin (see `canSeeMargin`), the individual price
 * isn't even requested from the ERP — the sensitive figure never reaches
 * the use-case's response.
 */
export function makeGetClientCard(deps: GetClientCardDeps): GetClientCard {
  return async function getClientCard(clientId, viewer) {
    const client = await deps.clients.findById(clientId);
    if (!client) {
      throw new ClientNotFoundError(clientId);
    }
    if (isOwnerScoped(viewer.role) && client.responsibleManagerId !== viewer.id) {
      throw new ClientNotFoundError(clientId);
    }

    const showMargin = canSeeMargin(viewer.role);
    const contacts = await deps.contacts.listByClient(clientId);
    const products = await deps.products.list();
    const lines: ClientCardLine[] = await Promise.all(
      products.map(async (product): Promise<ClientCardLine> => {
        const stock = await deps.erp.getStockLevel(product.id);
        const base: ClientCardLine = {
          product,
          freeQuantity: stock?.freeQuantity ?? null,
          unit: stock?.unit ?? product.unit,
        };
        if (!showMargin) {
          return base;
        }
        const price = await deps.erp.getIndividualPrice(clientId, product.id);
        return { ...base, price: price?.price ?? null };
      }),
    );

    if (!showMargin) {
      return { client, contacts, lines };
    }
    // Debt/limit are commercially sensitive: only requested for a role with margin access.
    const balance = await deps.erp.getClientBalance(clientId);
    return { client, contacts, lines, balance };
  };
}
