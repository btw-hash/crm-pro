import type { Shipment, ShipmentId } from "@/domain/shipment/shipment";

export interface ShipmentRepository {
  save(shipment: Shipment): Promise<void>;
  findById(id: ShipmentId): Promise<Shipment | null>;
  findByDealId(dealId: string): Promise<Shipment | null>;
  list(): Promise<readonly Shipment[]>;
  listByManager(managerId: string): Promise<readonly Shipment[]>;
  listByStatus(status: string): Promise<readonly Shipment[]>;
}
