import type { SessionRepository } from "@/application/ports/session-repository";

export type Logout = (token: string | undefined) => Promise<void>;

/** Ends the session by token (idempotent: no token/session — a plain no-op). */
export function makeLogout(deps: { sessions: SessionRepository }): Logout {
  return async function logout(token) {
    if (token) {
      await deps.sessions.delete(token);
    }
  };
}
