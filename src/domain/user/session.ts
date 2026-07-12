import type { UserId } from "./user";

/**
 * Login session: an opaque token (stored in an httpOnly cookie), tied to a
 * user and an expiry. A pure primitive — no infrastructure dependencies.
 */
export interface Session {
  readonly token: string;
  readonly userId: UserId;
  /** ISO expiry time. */
  readonly expiresAt: string;
}

/** Whether the session has expired as of `nowIso`. */
export function isExpired(session: Session, nowIso: string): boolean {
  return session.expiresAt <= nowIso;
}
