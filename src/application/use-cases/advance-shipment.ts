import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import { advanceShipment, type Shipment, ShipmentError } from "@/domain/shipment/shipment";
import type { ShipmentId } from "@/domain/shipment/shipment";

export type AdvanceShipmentUseCase = (input: { id: ShipmentId }) => Promise<Shipment>;

/** Moves a shipment to the next stage of the flow (placed→accounting→warehouse→delivery→delivered). */
export function makeAdvanceShipment(deps: {
  shipments: ShipmentRepository;
}): AdvanceShipmentUseCase {
  return async ({ id }) => {
    const shipment = await deps.shipments.findById(id);
    if (!shipment) {
      throw new ShipmentError("Shipment not found");
    }
    const next = advanceShipment(shipment);
    await deps.shipments.save(next);
    return next;
  };
}
