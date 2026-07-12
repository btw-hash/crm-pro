import type { Session } from "@/domain/user/session";
import type { UserId } from "@/domain/user/user";

/**
 * Session storage. Token and expiry are set by the implementation (infrastructure)
 * — like `StubNotifier`/`DealEventRecorder`. In-memory for now, a Postgres table
 * later (the port won't change).
 */
export interface SessionRepository {
  /** Creates a session for a user (generates a token and expiry). */
  create(userId: UserId): Promise<Session>;
  /** A valid (not expired) session by token, or null. */
  findValid(token: string): Promise<Session | null>;
  delete(token: string): Promise<void>;
}
