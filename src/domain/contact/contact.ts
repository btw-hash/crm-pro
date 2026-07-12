import type { ClientId } from "@/domain/client/client";
import type { Id } from "@/domain/shared/id";

export type ContactId = Id<"ContactId">;

/**
 * Role of a contact person in a B2B purchase. A deal is closed by several people —
 * it matters who decides, who influences, and who actually uses the product.
 */
export const CONTACT_ROLES = ["decision_maker", "influencer", "user"] as const;
export type ContactRole = (typeof CONTACT_ROLES)[number];

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  decision_maker: "Decision maker",
  influencer: "Influencer",
  user: "User",
};

/** Client's contact person (from the ERP/CRM). Phone/email — for the manager to reach out. */
export interface Contact {
  readonly id: ContactId;
  readonly clientId: ClientId;
  readonly name: string;
  readonly position: string;
  readonly role: ContactRole;
  readonly phone?: string;
  readonly email?: string;
}
