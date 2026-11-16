import Link from "next/link";
import { clientPriority, CLIENT_PRIORITY_LABELS } from "@/domain/client/client-priority";
import type { ClientPriority } from "@/domain/client/client-priority";
import {
  CLIENT_FILTERS,
  CLIENT_FILTER_LABELS,
  parseClientFilter,
  type ClientFilter,
} from "@/domain/client/client-filter";
import { countByFilter, selectVisibleClients } from "./_lib/client-list-filter";
import { CLIENT_TYPE_LABELS } from "@/domain/client/client-type";
import { matchesClientQuery, normalizeClientQuery } from "@/domain/client/client-search";
import { canSeeClientBase, canSeeMargin, ROLE_LABELS } from "@/domain/shared/role";
import type { ClientBalanceView } from "@/application/use-cases/get-client-balance-view";
import { redirect } from "next/navigation";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import { NewClientButton } from "./_components/new-client-button";
import { ClientsSearchBar } from "./_components/clients-search-bar";

/** Palette of initials-avatar backgrounds, cycled by row index (from the design reference). */
const AVATAR_BG = ["#1c1f27", "#363c49", "#565e6e", "#9aa0ad"] as const;

/** Segment pill styles by client priority (warm theme, from the design reference). */
const SEGMENT_PILL: Record<ClientPriority, { background: string; color: string }> = {
  high: { background: "#f7e4e2", color: "var(--accent)" },
  medium: { background: "#efe9e2", color: "#6a5f54" },
  low: { background: "#fbf1d6", color: "#9a6a00" },
};

const GRID_COLUMNS = "2.2fr 1fr 1.1fr 1.1fr 0.9fr 0.6fr";

/** Initials from the first letters of name words (up to two): "Kestrel Cocoa" → "BC". */
function initials(name: string): string {
  const words = name.split(/\s+/).filter((word) => word.length > 0);
  const letters = words.slice(0, 2).map((word) => word.charAt(0).toUpperCase());
  return letters.join("") || "?";
}

/** Manager's last name for the MANAGER column (last word of the full name). */
function managerSurname(id: string): string {
  const label = personLabel(id);
  const words = label.split(/\s+/).filter((word) => word.length > 0);
  return words[words.length - 1] ?? label;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const user = await requireUser();
  // RBAC: the commercial client base (counterparties + AR/limit/prices) — only for roles
  // that work with clients commercially (head of sales/manager/category manager).
  // Operational roles (accountant/logistics) and the technologist are not admitted here —
  // they have their own scope (orders/shipments/tests), and the client list with
  // financials is commercially sensitive (see docs/DATA_POLICY.md).
  if (!canSeeClientBase(user.role)) {
    redirect("/");
  }
  const container = getContainer();
  const clients = await container.listClients(user);
  const canCreate = canSeeMargin(user.role);
  const showBalances = canSeeMargin(user.role);
  const resolvedParams = await searchParams;
  const activeFilter = parseClientFilter(resolvedParams.filter);
  // Search by client name (?q=, SSR — like the filters). The decorative field used to do
  // nothing; now it's a GET form that narrows the list case-insensitively.
  const rawQuery = resolvedParams.q ?? "";
  const query = normalizeClientQuery(rawQuery);

  // Real data (not a prototype mock): balances per client (for commercial roles) and a
  // deal count per client. Balances come from the ERP through a port; gated by role.
  const [balances, dealsWithStatus] = await Promise.all([
    showBalances
      ? Promise.all(clients.map((client) => container.getClientBalanceView(client.id)))
      : Promise.resolve<readonly (ClientBalanceView | null)[]>([]),
    container.listDealsWithStatus(user),
  ]);
  const dealsByClient = new Map<string, number>();
  for (const item of dealsWithStatus) {
    const key = item.deal.clientId;
    dealsByClient.set(key, (dealsByClient.get(key) ?? 0) + 1);
  }
  // Balance by client id — so data "travels" with the client and doesn't depend on the
  // array position (search/filter reshuffle the list).
  const balanceByClient = new Map<string, ClientBalanceView | null>();
  clients.forEach((client, index) => {
    balanceByClient.set(client.id, balances[index] ?? null);
  });

  // Filter facts source per client.
  // A single source for both the chip counters and the actual list filtering — no drift.
  // First narrow by name search (?q=), then compute counts/filters over the same set —
  // so the chip numbers match what's actually shown.
  const filterSources = clients
    .map((client) => ({
      client,
      isOverLimit: balanceByClient.get(client.id)?.isOverLimit ?? false,
      dealCount: dealsByClient.get(client.id) ?? 0,
    }))
    .filter(({ client }) => matchesClientQuery(client.name, query));
  const counts = countByFilter(filterSources, CLIENT_FILTERS);
  const visibleClients = selectVisibleClients(filterSources, activeFilter);
  const total = filterSources.length;

  // Filter chip counter palette (warm theme, from the design reference).
  const FILTER_CHIP: Record<ClientFilter, { bg: string; color: string }> = {
    all: { bg: "rgba(255,255,255,.18)", color: "#fff" },
    key: { bg: "#f7e4e2", color: "var(--accent)" },
    debtors: { bg: "#fbf1d6", color: "#9a6a00" },
    new: { bg: "#efe9e2", color: "#6a5f54" },
  };

  // A chip's link keeps the active search (?q=) — switching segments doesn't clear the query.
  const chipHref = (filter: ClientFilter): string => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (query !== "") params.set("q", rawQuery.trim());
    const qs = params.toString();
    return qs ? `/clients?${qs}` : "/clients";
  };

  const filters = CLIENT_FILTERS.map((filter) => ({
    id: filter,
    label: CLIENT_FILTER_LABELS[filter],
    count: counts[filter],
    active: filter === activeFilter,
    href: chipHref(filter),
    chipBg: FILTER_CHIP[filter].bg,
    chipColor: FILTER_CHIP[filter].color,
  }));

  return (
    <section className="scr" style={{ color: "#16181d", fontFamily: "Arial" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px" }}>Clients</div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: "4px" }}>
            Counterparty base › ERP data · {total} companies · {personLabel(user.id)} ·{" "}
            {ROLE_LABELS[user.role]}
            {user.role === "mop" ? " · showing only your clients" : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <ClientsSearchBar initialValue={rawQuery} activeFilter={activeFilter} />
          {canCreate ? <NewClientButton /> : null}
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={filter.href}
            aria-current={filter.active ? "true" : undefined}
            style={
              filter.active
                ? {
                    border: "none",
                    background: "#1c1f27",
                    color: "#fff",
                    font: "600 13px Arial",
                    padding: "8px 15px",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    cursor: "pointer",
                    textDecoration: "none",
                  }
                : {
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "rgba(255,255,255,0.5)",
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    color: "#16181d",
                    font: "600 13px Arial",
                    padding: "8px 15px",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(31,45,80,0.06)",
                    textDecoration: "none",
                  }
            }
          >
            {filter.label}{" "}
            <span
              style={{
                background: filter.chipBg,
                color: filter.chipColor,
                borderRadius: "10px",
                padding: "1px 7px",
                font: "600 11px Arial",
              }}
            >
              {filter.count}
            </span>
          </Link>
        ))}
      </div>

      <div
        className="r-table"
        style={{
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(22px) saturate(1.3)",
          WebkitBackdropFilter: "blur(22px) saturate(1.3)",
          border: "1px solid rgba(255,255,255,0.7)",
          boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
          borderRadius: "22px",
          padding: "8px 22px 14px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: GRID_COLUMNS,
            gap: "12px",
            padding: "14px 6px 12px",
            borderBottom: "1px solid #eef0f2",
            font: "600 11px Arial",
            letterSpacing: ".5px",
            color: "#9a9ea8",
          }}
        >
          <span>CLIENT</span>
          <span>SEGMENT</span>
          <span>BALANCE</span>
          <span>CREDIT LIMIT</span>
          <span>MANAGER</span>
          <span style={{ textAlign: "right" }}>PROCESSES</span>
        </div>

        {visibleClients.map(({ client, index }, position) => {
          const priority = clientPriority(client.category);
          const pill = SEGMENT_PILL[priority];
          const avatarBg = AVATAR_BG[index % AVATAR_BG.length] ?? AVATAR_BG[0];
          const isLast = position === visibleClients.length - 1;
          const balanceView = balanceByClient.get(client.id) ?? null;
          // Balances (AR/limit) — only for roles with commercial number access.
          const balance = showBalances ? balanceView : null;
          const dealsCount = dealsByClient.get(client.id) ?? 0;
          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: GRID_COLUMNS,
                gap: "12px",
                alignItems: "center",
                padding: "13px 6px",
                borderBottom: isLast ? "none" : "1px solid #f3f4f6",
                cursor: "pointer",
                borderRadius: "10px",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "10px",
                    background: avatarBg,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    font: "700 11px Arial",
                    flex: "none",
                  }}
                >
                  {initials(client.name)}
                </div>
                <div>
                  <div style={{ font: "600 13px Arial" }}>{client.name}</div>
                  <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>
                    {client.ein ? `EIN ${client.ein}` : CLIENT_TYPE_LABELS[client.type]}
                  </div>
                </div>
              </div>
              <span>
                <span
                  style={{
                    background: pill.background,
                    color: pill.color,
                    font: "600 11px Arial",
                    padding: "3px 9px",
                    borderRadius: "999px",
                  }}
                >
                  {CLIENT_PRIORITY_LABELS[priority]}
                </span>
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  font: "700 13px Arial",
                  color: balance?.isOverLimit ? "var(--accent)" : "#16181d",
                }}
              >
                {balance ? balance.debt : "—"}
                {/* "Overdue" tag — a deterministic flag from the real ERP balance: the
                    client exceeded their credit limit (isOverLimit) => the debt is
                    overdue. Data from the port, not from AI (design reference: 1108). */}
                {balance?.isOverLimit ? (
                  <span
                    style={{
                      background: "#f7e4e2",
                      color: "var(--accent)",
                      font: "600 10px Arial",
                      padding: "2px 6px",
                      borderRadius: "999px",
                    }}
                  >
                    overdue
                  </span>
                ) : null}
              </span>
              <span style={{ font: "500 13px Arial", color: "#6b6f78" }}>
                {balance ? balance.creditLimit : "—"}
              </span>
              <span style={{ font: "500 13px Arial" }}>
                {managerSurname(client.responsibleManagerId)}
              </span>
              <span style={{ textAlign: "right", font: "700 13px Arial" }}>{dealsCount}</span>
            </Link>
          );
        })}

        {visibleClients.length === 0 ? (
          <div
            style={{
              padding: "18px 6px",
              font: "400 13px Arial",
              color: "#9a9ea8",
            }}
          >
            {query !== ""
              ? `Nothing found for "${rawQuery.trim()}"${
                  activeFilter !== "all"
                    ? ` in the "${CLIENT_FILTER_LABELS[activeFilter]}" segment`
                    : ""
                }`
              : `No clients in the "${CLIENT_FILTER_LABELS[activeFilter]}" segment`}
          </div>
        ) : null}
      </div>
    </section>
  );
}
