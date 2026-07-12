import { randomUUID } from "node:crypto";
import type { SessionRepository } from "@/application/ports/session-repository";
import { isExpired, type Session } from "@/domain/user/session";
import type { UserId } from "@/domain/user/user";
import { prisma } from "./prisma-client";

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function toSession(row: { token: string; userId: string; expiresAt: Date }): Session {
  return {
    token: row.token,
    userId: row.userId as UserId,
    expiresAt: row.expiresAt.toISOString(),
  };
}

/**
 * Sessions in Postgres — survive a server restart (unlike in-memory). Token/TTL
 * generation logic mirrors InMemorySessionRepository (one shared port).
 */
export class PrismaSessionRepository implements SessionRepository {
  constructor(private readonly ttlMs: number = DEFAULT_TTL_MS) {}

  async create(userId: UserId): Promise<Session> {
    const session: Session = {
      token: randomUUID(),
      userId,
      expiresAt: new Date(Date.now() + this.ttlMs).toISOString(),
    };
    await prisma.session.create({
      data: {
        token: session.token,
        userId: session.userId,
        expiresAt: new Date(session.expiresAt),
      },
    });
    return session;
  }

  async findValid(token: string): Promise<Session | null> {
    const row = await prisma.session.findUnique({ where: { token } });
    if (!row) {
      return null;
    }
    const session = toSession(row);
    if (isExpired(session, new Date().toISOString())) {
      // Clean up the expired session (like in-memory). deleteMany does not throw on a race.
      await prisma.session.deleteMany({ where: { token } });
      return null;
    }
    return session;
  }

  async delete(token: string): Promise<void> {
    // deleteMany is idempotent (no row → no-op), unlike delete (throws P2025).
    // Mirrors the semantics of InMemorySessionRepository.delete (Map.delete does not throw).
    await prisma.session.deleteMany({ where: { token } });
  }
}
