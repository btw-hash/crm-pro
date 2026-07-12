import {
  NO_DRIVER,
  productsSummary,
  type Shipment,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
  shipmentTotalWeightKg,
} from "./shipment";

/** A warehouse-note row: what, to whom, where, how much, who's delivering. */
export interface DispatchNoteRow {
  readonly shipmentId: string;
  readonly clientName: string;
  readonly address: string;
  readonly products: string;
  readonly totalWeightKg: number;
  readonly driver: string;
  readonly status: ShipmentStatus;
  readonly statusLabel: string;
}

/** A stop on the delivery route. */
export interface DeliveryStop {
  readonly clientName: string;
  readonly address: string;
  readonly weightKg: number;
}

/** One driver's route for a given date. */
export interface DeliveryRoute {
  readonly driver: string;
  readonly date: string;
  readonly stops: readonly DeliveryStop[];
  readonly totalWeightKg: number;
}

/**
 * Warehouse note: the system assembles the client/address/products/weight/driver table
 * from shipments by itself — departments don't need to retype it by hand (passive
 * capture). Active shipments (not yet delivered) come first; deterministic.
 */
export function buildDispatchNote(
  shipments: readonly Shipment[],
  clientName: (clientId: string) => string,
): readonly DispatchNoteRow[] {
  return [...shipments]
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .map((shipment) => ({
      shipmentId: shipment.id,
      clientName: clientName(shipment.clientId),
      address: shipment.address,
      products: productsSummary(shipment),
      totalWeightKg: shipmentTotalWeightKg(shipment),
      driver: shipment.driver ?? NO_DRIVER,
      status: shipment.status,
      statusLabel: SHIPMENT_STATUS_LABELS[shipment.status],
    }));
}

/**
 * Delivery schedule: groups NOT-yet-delivered shipments by driver and date into routes
 * with stops and total weight. Also a deterministic derived view — for logistics.
 */
export function buildDeliverySchedule(
  shipments: readonly Shipment[],
  clientName: (clientId: string) => string,
): readonly DeliveryRoute[] {
  const byKey = new Map<string, { driver: string; date: string; stops: DeliveryStop[] }>();
  const pending = shipments.filter((s) => s.status !== "delivered");
  for (const shipment of pending) {
    const driver = shipment.driver ?? NO_DRIVER;
    const key = `${shipment.scheduledDate}|${driver}`;
    let route = byKey.get(key);
    if (!route) {
      route = { driver, date: shipment.scheduledDate, stops: [] };
      byKey.set(key, route);
    }
    route.stops.push({
      clientName: clientName(shipment.clientId),
      address: shipment.address,
      weightKg: shipmentTotalWeightKg(shipment),
    });
  }
  return [...byKey.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.driver.localeCompare(b.driver))
    .map((route) => ({
      driver: route.driver,
      date: route.date,
      stops: route.stops,
      totalWeightKg: route.stops.reduce((sum, stop) => sum + stop.weightKg, 0),
    }));
}

/** Shipment status labels for the UI (re-exported for convenience). */
export function shipmentStatusLabel(status: ShipmentStatus): string {
  return SHIPMENT_STATUS_LABELS[status];
}
