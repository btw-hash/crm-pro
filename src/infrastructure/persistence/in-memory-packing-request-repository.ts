import type { PackingRequestRepository } from "@/application/ports/packing-request-repository";
import type { PackingRequest, PackingRequestId } from "@/domain/packing/packing-request";

export class InMemoryPackingRequestRepository implements PackingRequestRepository {
  private readonly items = new Map<PackingRequestId, PackingRequest>();

  constructor(seed: readonly PackingRequest[] = []) {
    for (const request of seed) {
      this.items.set(request.id, request);
    }
  }

  async save(request: PackingRequest): Promise<void> {
    this.items.set(request.id, request);
  }

  async findById(id: PackingRequestId): Promise<PackingRequest | null> {
    return this.items.get(id) ?? null;
  }

  async list(): Promise<readonly PackingRequest[]> {
    return [...this.items.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
