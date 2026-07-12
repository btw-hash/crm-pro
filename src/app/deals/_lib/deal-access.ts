import type { Role } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

/**
 * Access to the DEALS section (the /deals funnel and the /deals/[id] card) —
 * sales roles only: the head of sales (sees the whole department) and a sales
 * manager (their own portfolio). Operational and non-sales roles (accountant/
 * logistics/technologist/category manager) run their own loop and shouldn't see
 * the deal portfolio (RBAC #7). A pure predicate — gates reads on the page and
 * narrows the query; kept in the deals area so we don't touch the shared role.ts.
 */
export function canAccessDeals(role: Role): boolean {
  return role === "head" || role === "mop";
}

/**
 * Whether the viewer can assign/reassign a deal to manager `managerId`.
 * The head of sales — to anyone; a sales manager — ONLY to themselves (RBAC #27:
 * a sales manager may not hand out deals to another manager). Other roles can't
 * create/edit deals at all (cut off earlier by canAccessDeals/mutation rights).
 * An empty id is invalid.
 */
export function canAssignToManager(viewer: Viewer, managerId: string): boolean {
  const id = managerId.trim();
  if (!id) {
    return false;
  }
  if (viewer.role === "head") {
    return true;
  }
  if (viewer.role === "mop") {
    return id === viewer.id;
  }
  return false;
}
