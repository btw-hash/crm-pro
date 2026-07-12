import type { Id } from "@/domain/shared/id";
import type { Role } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";

export type UserId = Id<"UserId">;

/**
 * An employee account. `passwordHash` is an opaque string (salt+hash);
 * the domain does not interpret it (verification is done by the
 * infrastructure hasher).
 */
export interface User {
  readonly id: UserId;
  readonly username: string;
  readonly name: string;
  readonly role: Role;
  readonly passwordHash: string;
}

/** The access context (id + role) derived from the account — what use-cases need. */
export function toViewer(user: User): Viewer {
  return { id: user.id, role: user.role };
}
