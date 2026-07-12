import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientRepository } from "@/application/ports/client-repository";
import {
  SHIPMENT_STATUS_LABELS,
  type Shipment,
  advanceShipmentFromStage,
  ShipmentError,
} from "@/domain/shipment/shipment";
import type { ShipmentId } from "@/domain/shipment/shipment";

export interface LoadingShipmentRow {
  readonly shipmentId: string;
  readonly orderNumber: string;
  readonly clientName: string;
  readonly address: string;
  readonly scheduledDate: string;
  readonly statusLabel: string;
  readonly driver: string | null;
  readonly totalWeightKg: number;
}

export type ListLoadingShipments = () => Promise<readonly LoadingShipmentRow[]>;
export type AdvanceLoadingShipment = (input: { id: ShipmentId }) => Promise<void>;

/** Shipments at the loading/delivery stage — the logistics manager's work queue. */
export function makeListLoadingShipments(deps: {
  shipments: ShipmentRepository;
  clients: ClientRepository;
}): ListLoadingShipments {
  return async () => {
    const [shipments, clients] = await Promise.all([
      deps.shipments.listByStatus("loading"),
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
      statusLabel: SHIPMENT_STATUS_LABELS[s.status],
      driver: s.driver,
      totalWeightKg: s.lines.reduce((sum, l) => sum + l.weightKg, 0),
    }));
  };
}

/** Moves a shipment from the loading stage → delivered. Logistics manager only. */
export function makeAdvanceLoadingShipment(deps: {
  shipments: ShipmentRepository;
}): AdvanceLoadingShipment {
  return async ({ id }) => {
    const shipment = await deps.shipments.findById(id);
    if (!shipment) {
      throw new ShipmentError("Shipment not found");
    }
    const next = advanceShipmentFromStage(shipment, "loading");
    await deps.shipments.save(next);
  };
}
