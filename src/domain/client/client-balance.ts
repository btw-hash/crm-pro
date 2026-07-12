import type { Money } from "@/domain/pricing/money";
import type { ClientId } from "./client";

/**
 * Client financial balance from the ERP: current accounts-receivable (AR) balance
 * and credit limit (payment deferral limit). Commercially sensitive data — shown
 * only to roles with margin access (see canSeeMargin).
 */
export interface ClientBalance {
  readonly clientId: ClientId;
  /** Current accounts-receivable balance. */
  readonly debt: Money;
  /** Credit limit (payment deferral limit). */
  readonly creditLimit: Money;
}

/** Available credit remaining: limit − debt (can be negative). */
export function availableCredit(balance: ClientBalance): Money {
  return balance.creditLimit.subtract(balance.debt);
}

/** Is the deferral limit exceeded (debt greater than the limit) — an order "on credit" is not allowed. */
export function isOverCreditLimit(balance: ClientBalance): boolean {
  return availableCredit(balance).isNegative();
}

/**
 * Would a new order push the client over the credit limit: would the order amount added
 * to the current debt exceed the deferral limit (`debt + orderAmount > creditLimit`,
 * equivalent to `orderAmount > availableCredit`). Deterministic, numbers come from the ERP.
 */
export function wouldExceedCreditLimit(balance: ClientBalance, orderAmount: Money): boolean {
  return availableCredit(balance).subtract(orderAmount).isNegative();
}
