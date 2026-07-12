"use server";

import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { type CommandHit, matchQuery } from "./command-palette-search";

const PER_GROUP = 5;

/**
 * Global search for the command palette (Ctrl+K). RBAC: clients/deals are fetched
 * through the container with visibility rules applied (a manager sees their own).
 * The catalog is shared. AI is not involved — a simple substring match.
 */
export async function globalSearch(query: string): Promise<readonly CommandHit[]> {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }
  const viewer = await resolveViewer();
  if (!viewer) {
    return [];
  }
  const container = getContainer();
  const [clients, deals, products] = await Promise.all([
    container.listClients(viewer),
    container.listDeals(viewer),
    container.listProducts(),
  ]);
  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));

  const clientHits: CommandHit[] = clients
    .filter((client) => matchQuery(client.name, trimmed))
    .slice(0, PER_GROUP)
    .map((client) => ({
      kind: "client",
      id: client.id,
      label: client.name,
      href: `/clients/${client.id}`,
    }));

  const dealHits: CommandHit[] = deals
    .filter((deal) => matchQuery(deal.title, trimmed))
    .slice(0, PER_GROUP)
    .map((deal) => ({
      kind: "deal",
      id: deal.id,
      label: deal.title,
      sublabel: clientNameById.get(deal.clientId),
      href: `/deals/${deal.id}`,
    }));

  const productHits: CommandHit[] = products
    .filter((product) => matchQuery(product.name, trimmed) || matchQuery(product.sku, trimmed))
    .slice(0, PER_GROUP)
    .map((product) => ({
      kind: "product",
      id: product.id,
      label: product.name,
      sublabel: product.sku,
      href: `/products`,
    }));

  return [...clientHits, ...dealHits, ...productHits];
}
