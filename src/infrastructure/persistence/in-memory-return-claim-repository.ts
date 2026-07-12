import type { ReturnClaimRepository } from "@/application/ports/return-claim-repository";
import type { ClientId } from "@/domain/client/client";
import type { ReturnClaim, ReturnClaimId } from "@/domain/return-claim/return-claim";

export class InMemoryReturnClaimRepository implements ReturnClaimRepository {
  private readonly items = new Map<ReturnClaimId, ReturnClaim>();

  constructor(seed: readonly ReturnClaim[] = []) {
    for (const claim of seed) {
      this.items.set(claim.id, claim);
    }
  }

  async save(claim: ReturnClaim): Promise<void> {
    this.items.set(claim.id, claim);
  }

  async findById(id: ReturnClaimId): Promise<ReturnClaim | null> {
    return this.items.get(id) ?? null;
  }

  async listByClient(clientId: ClientId): Promise<readonly ReturnClaim[]> {
    return [...this.items.values()]
      .filter((claim) => claim.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
