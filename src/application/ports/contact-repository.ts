import type { ClientId } from "@/domain/client/client";
import type { Contact } from "@/domain/contact/contact";

export interface ContactRepository {
  /** Client's contacts (decision-makers/influencers/users). */
  listByClient(clientId: ClientId): Promise<readonly Contact[]>;
}
