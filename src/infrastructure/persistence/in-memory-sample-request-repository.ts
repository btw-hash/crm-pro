import type { SampleRequestRepository } from "@/application/ports/sample-request-repository";
import type { DealId } from "@/domain/deal/deal";
import type { SampleRequest, SampleRequestId } from "@/domain/sample/sample-request";

export class InMemorySampleRequestRepository implements SampleRequestRepository {
  private readonly items = new Map<SampleRequestId, SampleRequest>();
  // Monotonic save sequence number per request. Round-robin anchors on the
  // "last" request, and requestedAt has only ms precision and can collide
  // between two requests — the save order makes the "last" one deterministic
  // (and closer to the semantics of a real DB, where "last" means insertion
  // order, not the request clock).
  private readonly savedOrder = new Map<SampleRequestId, number>();
  private sequence = 0;

  constructor(seed: readonly SampleRequest[] = []) {
    for (const request of seed) {
      this.put(request);
    }
  }

  private put(request: SampleRequest): void {
    this.items.set(request.id, request);
    this.savedOrder.set(request.id, ++this.sequence);
  }

  async save(request: SampleRequest): Promise<void> {
    this.put(request);
  }

  async update(request: SampleRequest): Promise<void> {
    this.items.set(request.id, request);
  }

  async findById(id: SampleRequestId): Promise<SampleRequest | null> {
    return this.items.get(id) ?? null;
  }

  async listByDeal(dealId: DealId): Promise<readonly SampleRequest[]> {
    return [...this.items.values()]
      .filter((r) => r.dealId === dealId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  async findLast(): Promise<SampleRequest | null> {
    return (
      [...this.items.values()].sort(
        (a, b) =>
          b.requestedAt.localeCompare(a.requestedAt) ||
          (this.savedOrder.get(b.id) ?? 0) - (this.savedOrder.get(a.id) ?? 0),
      )[0] ?? null
    );
  }
}
