import { randomUUID } from "node:crypto";
import type { SessionRepository } from "@/application/ports/session-repository";
import { isExpired, type Session } from "@/domain/user/session";
import type { UserId } from "@/domain/user/user";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

/**
 * Sessions live in process memory. They live in the cached container
 * (globalThis) → survive re-renders, but NOT a server restart. A Postgres
 * table will come later — the port won't change.
 */
export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async create(userId: UserId): Promise<Session> {
    const session: Session = {
      token: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + this.ttlMs).toISOString(),
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async findValid(token: string): Promise<Session | null> {
    const session = this.sessions.get(token);
    if (!session) {
      return null;
    }
    if (isExpired(session, new Date().toISOString())) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  async delete(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
