import type { AdditionalOrderRepository } from "@/application/ports/additional-order-repository";
import type { AdditionalOrder, AdditionalOrderId } from "@/domain/shipment/additional-order";

export class InMemoryAdditionalOrderRepository implements AdditionalOrderRepository {
  private readonly items = new Map<AdditionalOrderId, AdditionalOrder>();

  constructor(seed: readonly AdditionalOrder[] = []) {
    for (const order of seed) {
      this.items.set(order.id, order);
    }
  }

  async save(order: AdditionalOrder): Promise<void> {
    this.items.set(order.id, order);
  }

  async findById(id: AdditionalOrderId): Promise<AdditionalOrder | null> {
    return this.items.get(id) ?? null;
  }

  async listByDate(shipmentDate: string): Promise<readonly AdditionalOrder[]> {
    return [...this.items.values()]
      .filter((o) => o.shipmentDate === shipmentDate)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listByParent(parentOrderNumber: string): Promise<readonly AdditionalOrder[]> {
    return [...this.items.values()]
      .filter((o) => o.parentOrderNumber === parentOrderNumber)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
