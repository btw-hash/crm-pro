import type { Role } from "./role";

/**
 * Who is looking/acting: the user's identifier and their role. The minimal
 * carrier of access context for use-cases (owner-based visibility, role
 * gating) — without a dependency on infrastructure/auth.
 */
export interface Viewer {
  readonly id: string;
  readonly role: Role;
}
