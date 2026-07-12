import type { ErpGateway } from "@/application/ports/erp-gateway";
import { availableCredit, isOverCreditLimit } from "@/domain/client/client-balance";
import type { ClientId } from "@/domain/client/client";

/** Client balance for the screen: debt, limit, available balance (formatted) + over-limit flag. */
export interface ClientBalanceView {
  readonly debt: string;
  readonly creditLimit: string;
  readonly available: string;
  /** Available balance in minor units — for UI logic (warn if an order is close to the limit). */
  readonly availableMinor: number;
  readonly isOverLimit: boolean;
}

export type GetClientBalanceView = (clientId: ClientId) => Promise<ClientBalanceView | null>;

/**
 * Client balance (debt/credit limit) shown on the deal screen and used to
 * check an order placed "on credit" (#34). Numbers come from the ERP (via a
 * port), not the AI. `null` — if no balance is on record. Role gating
 * (commercially sensitive — `canSeeMargin` only) happens at the page level.
 */
export function makeGetClientBalanceView(deps: { erp: ErpGateway }): GetClientBalanceView {
  return async (clientId) => {
    const balance = await deps.erp.getClientBalance(clientId);
    if (!balance) return null;
    const available = availableCredit(balance);
    return {
      debt: balance.debt.format(),
      creditLimit: balance.creditLimit.format(),
      available: available.format(),
      availableMinor: available.amountMinor,
      isOverLimit: isOverCreditLimit(balance),
    };
  };
}
