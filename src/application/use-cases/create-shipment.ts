import type { ClientRepository } from "@/application/ports/client-repository";
import type { ProductRepository } from "@/application/ports/product-repository";
import type { ShipmentRepository } from "@/application/ports/shipment-repository";
import type { ClientId } from "@/domain/client/client";
import type { ProductId } from "@/domain/product/product";
import { ShipmentError, type Shipment, type ShipmentId } from "@/domain/shipment/shipment";
import { ClientNotFoundError } from "./create-deal";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface CreateShipmentLineInput {
  readonly productId: ProductId;
  readonly quantity: number;
}

export interface CreateShipmentInput {
  readonly id: ShipmentId;
  readonly clientId: ClientId;
  readonly managerId: string;
  readonly orderNumber: string;
  readonly lines: readonly CreateShipmentLineInput[];
  readonly scheduledDate: string; // YYYY-MM-DD
}

export type CreateShipment = (input: CreateShipmentInput) => Promise<Shipment>;

/**
 * Quick order -> shipment (#0055): a manager creates a shipment directly (client +
 * products + date). The shipment starts in "placed" status and lands in "My shipments".
 * Product names/units come from the catalog; line weight = quantity (kg).
 */
export function makeCreateShipment(deps: {
  shipments: ShipmentRepository;
  clients: ClientRepository;
  products: ProductRepository;
}): CreateShipment {
  return async function createShipment(input) {
    const client = await deps.clients.findById(input.clientId);
    if (!client) {
      throw new ClientNotFoundError(input.clientId);
    }
    if (input.lines.length === 0) {
      throw new ShipmentError("Add at least one line item to the shipment");
    }
    if (!DATE_RE.test(input.scheduledDate)) {
      throw new ShipmentError("Invalid shipment date (expected YYYY-MM-DD)");
    }
    const products = await deps.products.list();
    const productById = new Map(products.map((p) => [String(p.id), p]));
    const lines = input.lines.map((line) => {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new ShipmentError("Quantity for each line item must be greater than zero");
      }
      const product = productById.get(String(line.productId));
      if (!product) {
        throw new ShipmentError("Product not found in the catalog");
      }
      return {
        productName: product.name,
        quantity: line.quantity,
        unit: product.unit,
        weightKg: line.quantity,
      };
    });
    const shipment: Shipment = {
      id: input.id,
      clientId: input.clientId,
      managerId: input.managerId,
      orderNumber: input.orderNumber,
      address: client.city ?? "—",
      lines,
      driver: null,
      scheduledDate: input.scheduledDate,
      status: "placed",
      // A quick shipment isn't tied to a process/deal (#0055).
      dealId: null,
    };
    await deps.shipments.save(shipment);
    return shipment;
  };
}
