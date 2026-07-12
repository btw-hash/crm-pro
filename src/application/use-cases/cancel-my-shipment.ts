import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import { cancelShipment, type Shipment, ShipmentError } from "@/domain/shipment/shipment";
import type { ShipmentId } from "@/domain/shipment/shipment";

export type CancelMyShipment = (input: { id: ShipmentId; managerId: string }) => Promise<Shipment>;

/**
 * Cancels the OWNER's own shipment (manager/head): only an order the owner
 * placed themselves can be cancelled (owner boundary, same as "My shipments"),
 * and only while it hasn't been delivered yet.
 */
export function makeCancelMyShipment(deps: { shipments: ShipmentRepository }): CancelMyShipment {
  return async ({ id, managerId }) => {
    const shipment = await deps.shipments.findById(id);
    if (!shipment) {
      throw new ShipmentError("Shipment not found");
    }
    if (shipment.managerId !== managerId) {
      throw new ShipmentError("Cannot cancel someone else's shipment");
    }
    const cancelled = cancelShipment(shipment);
    await deps.shipments.save(cancelled);
    return cancelled;
  };
}
