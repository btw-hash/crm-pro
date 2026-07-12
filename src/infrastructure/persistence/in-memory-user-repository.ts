import type { PasswordHasher } from "@/application/ports/password-hasher";
import type { UserRepository } from "@/application/ports/user-repository";
import type { Role } from "@/domain/shared/role";
import { makeId } from "@/domain/shared/id";
import type { User, UserId } from "@/domain/user/user";

/** Demo account: the plaintext password is hashed when the repository loads. */
export interface SeedUser {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly role: Role;
  readonly password: string;
}

export class InMemoryUserRepository implements UserRepository {
  private readonly byUsername = new Map<string, User>();
  private readonly byId = new Map<UserId, User>();

  constructor(seed: readonly SeedUser[], hasher: PasswordHasher) {
    for (const spec of seed) {
      const user: User = {
        id: makeId<"UserId">(spec.id),
        username: spec.username.toLowerCase(),
        name: spec.name,
        role: spec.role,
        passwordHash: hasher.hash(spec.password),
      };
      this.byUsername.set(user.username, user);
      this.byId.set(user.id, user);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.byUsername.get(username.toLowerCase()) ?? null;
  }

  async findById(id: UserId): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }
}
