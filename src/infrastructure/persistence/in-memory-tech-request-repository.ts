import type { TechRequestRepository } from "@/application/ports/tech-request-repository";
import type { DealId } from "@/domain/deal/deal";
import type { TechRequest, TechRequestId } from "@/domain/tech-request/tech-request";

export class InMemoryTechRequestRepository implements TechRequestRepository {
  private readonly items = new Map<TechRequestId, TechRequest>();

  constructor(seed: readonly TechRequest[] = []) {
    for (const req of seed) {
      this.items.set(req.id, req);
    }
  }

  async save(request: TechRequest): Promise<void> {
    this.items.set(request.id, request);
  }

  async findById(id: TechRequestId): Promise<TechRequest | null> {
    return this.items.get(id) ?? null;
  }

  async listOpen(): Promise<readonly TechRequest[]> {
    return [...this.items.values()]
      .filter((r) => r.status === "open")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listActive(): Promise<readonly TechRequest[]> {
    return [...this.items.values()]
      .filter((r) => r.status === "open" || r.status === "in_progress")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listAll(): Promise<readonly TechRequest[]> {
    return [...this.items.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listForTechnologist(technologistId: string): Promise<readonly TechRequest[]> {
    return [...this.items.values()]
      .filter((r) => r.assignedTo === technologistId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listByDeal(dealId: DealId): Promise<readonly TechRequest[]> {
    return [...this.items.values()]
      .filter((r) => r.dealId === dealId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
