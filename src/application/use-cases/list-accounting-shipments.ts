import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientRepository } from "@/application/ports/client-repository";
import {
  SHIPMENT_STATUS_LABELS,
  type Shipment,
  advanceShipmentFromStage,
  ShipmentError,
} from "@/domain/shipment/shipment";
import type { ShipmentId } from "@/domain/shipment/shipment";

export interface AccountingShipmentRow {
  readonly shipmentId: string;
  readonly orderNumber: string;
  readonly clientName: string;
  readonly address: string;
  readonly scheduledDate: string;
  readonly statusLabel: string;
  readonly totalWeightKg: number;
}

export type ListAccountingShipments = () => Promise<readonly AccountingShipmentRow[]>;
export type AdvanceAccountingShipment = (input: { id: ShipmentId }) => Promise<void>;

/** Orders at the accounting stage — the accountant's work queue (prepare ERP documents). */
export function makeListAccountingShipments(deps: {
  shipments: ShipmentRepository;
  clients: ClientRepository;
}): ListAccountingShipments {
  return async () => {
    const [shipments, clients] = await Promise.all([
      deps.shipments.listByStatus("in_accounting"),
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
      totalWeightKg: s.lines.reduce((sum, l) => sum + l.weightKg, 0),
    }));
  };
}

/** Moves an order from in_accounting → in_warehouse (accountant has prepared the documents). */
export function makeAdvanceAccountingShipment(deps: {
  shipments: ShipmentRepository;
}): AdvanceAccountingShipment {
  return async ({ id }) => {
    const shipment = await deps.shipments.findById(id);
    if (!shipment) {
      throw new ShipmentError("Shipment not found");
    }
    const next = advanceShipmentFromStage(shipment, "in_accounting");
    await deps.shipments.save(next);
  };
}
