import {
  NO_DRIVER,
  type Shipment,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
  shipmentTotalWeightKg,
} from "./shipment";

/** A summary-report row: one shipment for the day. */
export interface ShipmentSummaryRow {
  readonly shipmentId: string;
  readonly orderNumber: string;
  readonly clientName: string;
  readonly address: string;
  readonly weightKg: number;
  readonly driver: string;
  readonly status: ShipmentStatus;
  readonly statusLabel: string;
}

/** Summary across all shipments for one date: rows + the day's computed totals. */
export interface ShipmentSummaryDay {
  readonly date: string;
  readonly rows: readonly ShipmentSummaryRow[];
  readonly shipmentCount: number;
  readonly totalWeightKg: number;
  /** Number of trucks/drivers involved (unassigned excluded). */
  readonly driverCount: number;
  readonly clientCount: number;
  /** How many of the day's shipments have already been delivered (actuals). */
  readonly deliveredCount: number;
  /** How many of the day's shipments still have no truck assigned. */
  readonly unassignedCount: number;
}

/**
 * Daily shipment summary report (#128): the system aggregates the day's shipments by
 * itself — by client/address/weight/driver, plus the day's totals (weight, number of
 * runs, trucks, clients). This is the link between the warehouse note and the delivery
 * schedule: the head of sales sees the full picture of the day and confirms it (passive
 * capture). Unlike the delivery schedule, this report is a FACT for the day, so it also
 * includes already-delivered shipments. Everything is deterministic from the data, not
 * from AI.
 */
export function buildShipmentSummary(
  shipments: readonly Shipment[],
  clientName: (clientId: string) => string,
): readonly ShipmentSummaryDay[] {
  const byDate = new Map<string, Shipment[]>();
  for (const shipment of shipments) {
    const bucket = byDate.get(shipment.scheduledDate);
    if (bucket) {
      bucket.push(shipment);
    } else {
      byDate.set(shipment.scheduledDate, [shipment]);
    }
  }

  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, dayShipments]) => {
      const rows: ShipmentSummaryRow[] = dayShipments
        .map((shipment) => ({
          shipmentId: shipment.id,
          orderNumber: shipment.orderNumber,
          clientName: clientName(shipment.clientId),
          address: shipment.address,
          weightKg: shipmentTotalWeightKg(shipment),
          driver: shipment.driver ?? NO_DRIVER,
          status: shipment.status,
          statusLabel: SHIPMENT_STATUS_LABELS[shipment.status],
        }))
        .sort((a, b) => a.clientName.localeCompare(b.clientName));

      const assignedDrivers = new Set(
        dayShipments.filter((s) => s.driver !== null).map((s) => s.driver),
      );
      const clients = new Set(dayShipments.map((s) => s.clientId));

      return {
        date,
        rows,
        shipmentCount: rows.length,
        totalWeightKg: rows.reduce((sum, row) => sum + row.weightKg, 0),
        driverCount: assignedDrivers.size,
        clientCount: clients.size,
        deliveredCount: dayShipments.filter((s) => s.status === "delivered").length,
        unassignedCount: dayShipments.filter((s) => s.driver === null).length,
      };
    });
}
