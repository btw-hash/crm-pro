import type { ClientRepository } from "@/application/ports/client-repository";
import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import {
  type AccountingClient,
  type AccountingHandoff,
  buildAccountingHandoff,
} from "@/domain/shipment/accounting";
import {
  buildDeliverySchedule,
  buildDispatchNote,
  type DeliveryRoute,
  type DispatchNoteRow,
} from "@/domain/shipment/dispatch";
import { buildShipmentSummary, type ShipmentSummaryDay } from "@/domain/shipment/summary";

export interface DispatchPlanView {
  /** Memo to accounting — what to prepare for the order before handing off to the warehouse. */
  readonly accounting: AccountingHandoff;
  /** Note to the warehouse — an auto-assembled table of shipments. */
  readonly note: readonly DispatchNoteRow[];
  /** Daily shipment summary report — aggregated by date (between the note and the schedule). */
  readonly summary: readonly ShipmentSummaryDay[];
  /** Delivery schedule — routes by driver/date. */
  readonly schedule: readonly DeliveryRoute[];
}

export type GetDispatchPlan = () => Promise<DispatchPlanView>;

/**
 * Assembles the shipment's derived documents (warehouse note + delivery
 * schedule) from orders — the system does this ITSELF, so departments don't
 * have to retype it by hand (passive capture, #128). Numbers/contents are
 * deterministic from the data, not the AI.
 */
export function makeGetDispatchPlan(deps: {
  shipments: ShipmentRepository;
  clients: ClientRepository;
}): GetDispatchPlan {
  return async () => {
    const [shipments, clients] = await Promise.all([deps.shipments.list(), deps.clients.list()]);
    const nameById = new Map<string, string>(clients.map((client) => [client.id, client.name]));
    const infoById = new Map<string, AccountingClient>(
      clients.map((client) => [client.id, { name: client.name, ein: client.ein ?? null }]),
    );
    const name = (clientId: string): string => nameById.get(clientId) ?? clientId;
    const info = (clientId: string): AccountingClient =>
      infoById.get(clientId) ?? { name: clientId, ein: null };
    return {
      accounting: buildAccountingHandoff(shipments, info),
      note: buildDispatchNote(shipments, name),
      summary: buildShipmentSummary(shipments, name),
      schedule: buildDeliverySchedule(shipments, name),
    };
  };
}
