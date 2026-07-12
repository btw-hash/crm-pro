import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { Shipment, ShipmentId } from "@/domain/shipment/shipment";

export class InMemoryShipmentRepository implements ShipmentRepository {
  private readonly items = new Map<ShipmentId, Shipment>();

  constructor(seed: readonly Shipment[] = []) {
    for (const shipment of seed) {
      this.items.set(shipment.id, shipment);
    }
  }

  async save(shipment: Shipment): Promise<void> {
    this.items.set(shipment.id, shipment);
  }

  async findById(id: ShipmentId): Promise<Shipment | null> {
    return this.items.get(id) ?? null;
  }

  async findByDealId(dealId: string): Promise<Shipment | null> {
    return [...this.items.values()].find((s) => s.dealId === dealId) ?? null;
  }

  async list(): Promise<readonly Shipment[]> {
    return [...this.items.values()];
  }

  async listByManager(managerId: string): Promise<readonly Shipment[]> {
    return [...this.items.values()].filter((s) => s.managerId === managerId);
  }

  async listByStatus(status: string): Promise<readonly Shipment[]> {
    return [...this.items.values()].filter((s) => s.status === status);
  }
}
