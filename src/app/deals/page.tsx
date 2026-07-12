import { notFound } from "next/navigation";
import { DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { MANAGER_LABELS, managerLabel } from "@/infrastructure/persistence/seed";
import { Suspense } from "react";
import { canAccessDeals } from "./_lib/deal-access";
import { DealDrawer } from "./_components/deal-drawer";
import { DealsKanban, type KanbanDeal } from "./_components/deals-kanban";
import { FilterButton } from "./_components/filter-button";
import { NewDealButton } from "./_components/new-deal-button";
import { isSavedViewId } from "./_components/saved-views";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; createForClient?: string }>;
}) {
  const container = getContainer();
  const user = await requireUser();
  // RBAC #7: the deals section is for sales roles only (head of sales/manager). Operational
  // roles (accountant/logistics/technologist/category manager) run their own loop and don't
  // see the deal portfolio. A direct visit to /deals with another role → 404.
  if (!canAccessDeals(user.role)) {
    notFound();
  }
  const params = await searchParams;
  const initialView = isSavedViewId(params.view) ? params.view : undefined;
  const [deals, clients] = await Promise.all([
    container.listDealsWithStatus(user),
    container.listClients(user),
  ]);
  const clientNameById = new Map(clients.map((client) => [client.id, client.name]));

  const kanbanDeals: KanbanDeal[] = deals.map(
    ({ deal, needsNextStep, daysOnStage, stale, health }) => ({
      id: deal.id,
      title: deal.title,
      stage: deal.stage,
      clientId: deal.clientId,
      clientName: clientNameById.get(deal.clientId) ?? "—",
      managerName: managerLabel(deal.responsibleManagerId),
      goal: deal.goal ?? DEFAULT_DEAL_GOAL,
      outcome: deal.outcome,
      needsNextStep,
      daysOnStage,
      stale,
      health,
      isMine: deal.responsibleManagerId === user.id,
    }),
  );

  const canCreate = user.role === "mop" || user.role === "head";

  // RBAC #10: the client dropdown in the create form is scoped to the viewer's owner
  // scope (a manager only sees their own portfolio of accounts, not the whole base).
  // listClients already narrows by role; we use the same clients shown on the board.
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
  // RBAC #27 (UI): the responsible-manager dropdown — the head of sales sees every
  // manager, a manager sees only themself (can't assign a deal to another manager).
  // Server-side validation lives in createDealAction/updateDealAction (the UI narrowing
  // isn't the only guard).
  const managerOptions =
    user.role === "head"
      ? Object.entries(MANAGER_LABELS).map(([id, name]) => ({ id, name }))
      : [{ id: user.id, name: managerLabel(user.id) }];

  // Coming from a client card (?createForClient=<id>): open the create form with the
  // client pre-selected. Only accept an existing id, otherwise ignore.
  const createForClient =
    params.createForClient && clientOptions.some((c) => c.id === params.createForClient)
      ? params.createForClient
      : undefined;

  return (
    <section style={{ fontFamily: "Arial, sans-serif", color: "#16181d" }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px" }}>Deals</div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: 4 }}>
            The department&apos;s shared queue · drag a card between stages
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* The glass "Filter" button from the reference (reference p. 1227): to the left
              of the create button. There's no actual filter panel in CRM Pro yet — sorting/
              scope come from the saved views below. The button is presentational: it matches
              the design reference, but doesn't wire up a filtering backend that doesn't exist
              (the title explains the status). */}
          <FilterButton />
          {canCreate ? (
            <NewDealButton
              clients={clientOptions}
              managers={managerOptions}
              currentUserId={user.id}
              autoOpen={Boolean(createForClient)}
              initialClientId={createForClient}
            />
          ) : null}
        </div>
      </div>
      <Suspense fallback={null}>
        <DealsKanban deals={kanbanDeals} initialView={initialView} />
        <DealDrawer />
      </Suspense>
    </section>
  );
}
