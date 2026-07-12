import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientRepository } from "@/application/ports/client-repository";
import {
  SHIPMENT_STATUS_LABELS,
  type Shipment,
  type ShipmentStatus,
} from "@/domain/shipment/shipment";

export interface MyShipmentRow {
  readonly shipmentId: string;
  readonly orderNumber: string;
  readonly clientName: string;
  readonly address: string;
  readonly scheduledDate: string;
  readonly status: ShipmentStatus;
  readonly statusLabel: string;
  readonly driver: string | null;
}

export type ListMyShipments = (input: { managerId: string }) => Promise<readonly MyShipmentRow[]>;

/** Shipments for a specific manager — an owner-scoped status view for a sales manager. */
export function makeListMyShipments(deps: {
  shipments: ShipmentRepository;
  clients: ClientRepository;
}): ListMyShipments {
  return async ({ managerId }) => {
    const [shipments, clients] = await Promise.all([
      deps.shipments.listByManager(managerId),
      deps.clients.list(),
    ]);
    const nameById = new Map<string, string>(clients.map((c) => [c.id, c.name]));
    const sorted = [...shipments].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    return sorted.map((s: Shipment) => ({
      shipmentId: String(s.id),
      orderNumber: s.orderNumber,
      clientName: nameById.get(String(s.clientId)) ?? String(s.clientId),
      address: s.address,
      scheduledDate: s.scheduledDate,
      status: s.status,
      statusLabel: SHIPMENT_STATUS_LABELS[s.status],
      driver: s.driver,
    }));
  };
}
