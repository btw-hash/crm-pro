import type { UserRepository } from "@/application/ports/user-repository";
import type { Role } from "@/domain/shared/role";
import type { User, UserId } from "@/domain/user/user";
import { prisma } from "./prisma-client";

function toUser(row: {
  id: string;
  username: string;
  name: string;
  role: string;
  passwordHash: string;
}): User {
  return {
    id: row.id as UserId,
    username: row.username,
    name: row.name,
    role: row.role as Role,
    passwordHash: row.passwordHash,
  };
}

export class PrismaUserRepository implements UserRepository {
  async findByUsername(username: string): Promise<User | null> {
    // The username is stored lowercase (as in InMemoryUserRepository) — normalize the query.
    const row = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
    return row ? toUser(row) : null;
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await prisma.user.findUnique({ where: { id } });
    return row ? toUser(row) : null;
  }
}
