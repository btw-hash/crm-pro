/**
 * MVP role model: three roles with different visibility rights. Gating is
 * done with the pure predicates below; they are used by both use-cases
 * (data access) and presentation (what to show/hide). Full per-action
 * authorization (an auth provider, mutation permission checks) is a
 * separate task.
 *
 * - head (Head of Sales) — sees the whole department: all clients/deals,
 *   margin and finance, summary analytics across managers, the head's AI
 *   assistant.
 * - mop (Manager) — only their own portfolio; sees margin/prices for their
 *   own clients and PERSONAL analytics (their own revenue/funnel), but not
 *   colleagues' data.
 * - technologist (Technologist) — the shared test queue; does not see
 *   commercial figures (margin/prices/AR/revenue) at all.
 * - procurement (Category Manager / Buyer) — supply: quotas and deficit
 *   allocation; sees prices/margin (they purchase), but not personal sales
 *   analytics or the head's assistant; department data, not "their own
 *   portfolio".
 * - accountant (Accountant) — operational scope: accepts orders from the
 *   Manager (the in_accounting stage) and prepares ERP documents before
 *   handing off to the warehouse.
 * - logist (Logistics) — operational scope: owns the loading/delivery
 *   stage, assigns trucks, marks departure.
 */
export type Role = "head" | "mop" | "technologist" | "procurement" | "accountant" | "logist";

export const ROLE_LABELS: Record<Role, string> = {
  head: "Head of Sales",
  mop: "Manager",
  technologist: "Technologist",
  procurement: "Category Manager / Buyer",
  accountant: "Accountant",
  logist: "Logistics",
};

/**
 * Whether the role sees commercially sensitive figures — margin, discounts,
 * individual prices, AR/credit limit, revenue. The technologist tests the
 * product at the plant and does not need these figures → does not see
 * them. Head of Sales and Manager — yes.
 */
export function canSeeMargin(role: Role): boolean {
  return role !== "technologist";
}

/**
 * Whether visibility is limited to "own" records only (clients/deals where
 * the user is the owner). Only the Manager is limited to their own
 * portfolio; the Head of Sales sees the whole department, the
 * technologist sees the shared test queue.
 */
export function isOwnerScoped(role: Role): boolean {
  return role === "mop";
}

/**
 * Access to the COMMERCIAL client base (the "Clients" section: the list of
 * accounts, AR/credit limit, individual prices, segments). The account list
 * and its terms are a trade secret (see `docs/DATA_POLICY.md`), not
 * operational data. Seen by those who work with clients commercially:
 * - Head of Sales (whole department) and Manager (own portfolio) — they sell;
 * - Category Manager / Buyer — maintains assortment/purchase prices, works
 *   with the client base.
 *
 * Operational roles (accountant, logistics) and the technologist have no
 * need for the commercial client base — their scope is orders/shipments/
 * tests for a specific task, not a client list with finances. The section
 * is closed to them (see the guard in `app/clients`).
 */
export function canSeeClientBase(role: Role): boolean {
  return role === "head" || role === "mop" || role === "procurement";
}

/**
 * Whether the role sees department-wide summary analytics — revenue broken
 * down by manager and the funnel across all deals (comparing colleagues).
 * Head of Sales only. The Manager only sees their own personal slice (see
 * `canSeePersonalAnalytics`).
 */
export function canSeeTeamAnalytics(role: Role): boolean {
  return role === "head";
}

/**
 * Whether the analytics section is available at all. The technologist does
 * not see it (no commerce involved); the Head of Sales sees the
 * department, the Manager sees their personal dashboard.
 */
export function canSeePersonalAnalytics(role: Role): boolean {
  // Personal sales analytics — for the salesperson and the head. The
  // category manager and technologist don't sell → they have no personal
  // revenue/funnel slice.
  return role === "mop" || role === "head";
}

/**
 * Access to the AI assistant — Head of Sales and Manager (design §4). The
 * head sees a snapshot of the WHOLE department; for the Manager, the
 * snapshot should be limited to their portfolio (owner-scope) —
 * TODO: the snapshot is currently shared; narrow this for a real
 * multi-user production setup.
 */
export function canUseManagerAssistant(role: Role): boolean {
  return role === "head" || role === "mop";
}

/** Access to the "Procurement" section (quotas/deficit allocation) — Category Manager and Head of Sales. */
export function canManageProcurement(role: Role): boolean {
  return role === "procurement" || role === "head";
}

/**
 * Whether the role can create deals/tasks (the creation form on `/deals`).
 * Sells — the manager (own client) and the head (any client). The
 * category manager handles procurement but doesn't create deals → the
 * "Create task" button on a client card must not lead them to a dead end
 * (the `/deals` form doesn't open for them).
 */
export function canCreateDeal(role: Role): boolean {
  return role === "mop" || role === "head";
}

/**
 * Access to the "Shipments/delivery" section (the full operational view —
 * the letter to the warehouse, the delivery schedule, the accounting memo).
 * Category Manager/procurement and Head of Sales. The salesperson hands the
 * order off to the department, the technologist does not.
 */
export function canManageShipments(role: Role): boolean {
  return role === "procurement" || role === "head";
}

/**
 * Whether the role sees THEIR OWN shipments (statuses for orders the
 * Manager placed). After placing an order the Manager loses visibility
 * into /shipments (not their section) — here we only show them a track of
 * their own orders.
 */
export function canViewMyShipments(role: Role): boolean {
  return role === "mop" || role === "head";
}

/**
 * Access to the accountant's section — accepting orders at the
 * in_accounting stage and preparing ERP documents. Accountant and Head of
 * Sales.
 */
export function canAccessAccountingStage(role: Role): boolean {
  return role === "accountant" || role === "head";
}

/**
 * Access to the logistics section — the loading/delivery stage (loading).
 * Logistics and Head of Sales.
 */
export function canAccessLoadingStage(role: Role): boolean {
  return role === "logist" || role === "head";
}

/** Access to the tech queue — the technologist (performer) and the Head of Sales. */
export function canSeeTechQueue(role: Role): boolean {
  return role === "technologist" || role === "head";
}

/**
 * Filing an add-on request outside business hours can be done by the
 * Manager (recording the client's add-on order) and the Head of Sales. The
 * technologist and category manager — no.
 */
export function canFileAdditionalOrder(role: Role): boolean {
  return role === "mop" || role === "head";
}
