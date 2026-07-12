import type { SessionRepository } from "@/application/ports/session-repository";
import type { UserRepository } from "@/application/ports/user-repository";
import { toViewer } from "@/domain/user/user";
import type { Viewer } from "@/domain/shared/viewer";

export type Authenticate = (token: string | undefined) => Promise<Viewer | null>;

/** Returns the Viewer for a session token (or null if the session/user doesn't exist). */
export function makeAuthenticate(deps: {
  users: UserRepository;
  sessions: SessionRepository;
}): Authenticate {
  return async function authenticate(token) {
    if (!token) {
      return null;
    }
    const session = await deps.sessions.findValid(token);
    if (!session) {
      return null;
    }
    const user = await deps.users.findById(session.userId);
    return user ? toViewer(user) : null;
  };
}
