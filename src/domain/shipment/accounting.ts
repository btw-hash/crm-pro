import {
  productsSummary,
  type Shipment,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
  shipmentTotalWeightKg,
} from "./shipment";

/** Documents accounting issues for an order (in practice — in the ERP, see #15). */
export const DEFAULT_ACCOUNTING_DOCS: readonly string[] = [
  "Invoice",
  "Packing list",
  "Bill of lading",
];

/** Order stages that require accounting action (before handoff to the warehouse). */
const ACCOUNTING_STAGES: ReadonlySet<ShipmentStatus> = new Set(["placed", "in_accounting"]);

/** Client details accounting needs to prepare the paperwork. */
export interface AccountingClient {
  readonly name: string;
  readonly ein: string | null;
}

/** A handoff-memo row for accounting: what to prepare for the order before it goes to the warehouse. */
export interface AccountingHandoffRow {
  readonly shipmentId: string;
  readonly orderNumber: string;
  readonly clientName: string;
  readonly ein: string | null;
  readonly products: string;
  readonly totalWeightKg: number;
  readonly shipmentDate: string;
  readonly status: ShipmentStatus;
  readonly statusLabel: string;
  /** Documents to issue (standard package). */
  readonly documents: readonly string[];
}

export interface AccountingHandoff {
  readonly rows: readonly AccountingHandoffRow[];
  readonly orderCount: number;
  readonly totalWeightKg: number;
}

/**
 * "Order → accounting" handoff memo: the system automatically assembles from orders the
 * package accounting needs to prepare (client details + line items + weight + shipment
 * date + the list of ERP documents) BEFORE handoff to the warehouse — departments don't
 * need to retype it by hand (passive capture, #128). Takes orders at the "Placed"/"In
 * accounting" stages. Actually issuing the documents in the ERP sits behind the
 * ErpGateway port (#15). Deterministic.
 */
export function buildAccountingHandoff(
  shipments: readonly Shipment[],
  client: (clientId: string) => AccountingClient,
): AccountingHandoff {
  const rows = [...shipments]
    .filter((shipment) => ACCOUNTING_STAGES.has(shipment.status))
    .sort(
      (a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate) ||
        a.orderNumber.localeCompare(b.orderNumber),
    )
    .map((shipment): AccountingHandoffRow => {
      const info = client(shipment.clientId);
      return {
        shipmentId: shipment.id,
        orderNumber: shipment.orderNumber,
        clientName: info.name,
        ein: info.ein,
        products: productsSummary(shipment),
        totalWeightKg: shipmentTotalWeightKg(shipment),
        shipmentDate: shipment.scheduledDate,
        status: shipment.status,
        statusLabel: SHIPMENT_STATUS_LABELS[shipment.status],
        documents: DEFAULT_ACCOUNTING_DOCS,
      };
    });
  return {
    rows,
    orderCount: rows.length,
    totalWeightKg: rows.reduce((sum, row) => sum + row.totalWeightKg, 0),
  };
}
