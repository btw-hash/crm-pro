/** Kind of a matched command-palette (Ctrl+K) item. */
export type CommandHitKind = "client" | "deal" | "product" | "command";

export interface CommandHit {
  readonly kind: CommandHitKind;
  readonly id: string;
  readonly label: string;
  readonly sublabel?: string;
  /** Where to navigate on selection (router.push). */
  readonly href: string;
}

/** Case-insensitive substring match. An empty query matches everything. */
export function matchQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  return q === "" || text.toLowerCase().includes(q);
}

/** Static navigation commands — filtered by the same query. */
export const PALETTE_COMMANDS: readonly CommandHit[] = [
  { kind: "command", id: "go-clients", label: "Go to: Clients", href: "/clients" },
  { kind: "command", id: "go-deals", label: "Go to: Deals", href: "/deals" },
  { kind: "command", id: "go-analytics", label: "Go to: Analytics", href: "/analytics" },
  { kind: "command", id: "go-catalog", label: "Go to: Catalog", href: "/products" },
];

export function matchingCommands(query: string): readonly CommandHit[] {
  return PALETTE_COMMANDS.filter((command) => matchQuery(command.label, query));
}
