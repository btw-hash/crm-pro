import type { AdditionalOrderRepository } from "@/application/ports/additional-order-repository";
import {
  createAdditionalOrder,
  type AdditionalOrder,
  type AdditionalOrderId,
  type CreateAdditionalOrderInput,
} from "@/domain/shipment/additional-order";

export type CreateAdditionalOrderUseCase = (
  input: CreateAdditionalOrderInput,
) => Promise<AdditionalOrder>;

/** Records an add-on request outside business hours and saves it to the repository. */
export function makeCreateAdditionalOrder(deps: {
  additionalOrders: AdditionalOrderRepository;
}): CreateAdditionalOrderUseCase {
  return async (input) => {
    const order = createAdditionalOrder(input);
    await deps.additionalOrders.save(order);
    return order;
  };
}

export type ListAdditionalOrdersByDate = (
  shipmentDate: string,
) => Promise<readonly AdditionalOrder[]>;

/** Add-on requests for a shipment date - for the daily summary in the shipments section. */
export function makeListAdditionalOrdersByDate(deps: {
  additionalOrders: AdditionalOrderRepository;
}): ListAdditionalOrdersByDate {
  return (shipmentDate) => deps.additionalOrders.listByDate(shipmentDate);
}

export type ListAdditionalOrdersByParent = (
  parentOrderNumber: string,
) => Promise<readonly AdditionalOrder[]>;

/** Add-on requests for a specific parent order. */
export function makeListAdditionalOrdersByParent(deps: {
  additionalOrders: AdditionalOrderRepository;
}): ListAdditionalOrdersByParent {
  return (parentOrderNumber) => deps.additionalOrders.listByParent(parentOrderNumber);
}

export type GetAdditionalOrder = (id: AdditionalOrderId) => Promise<AdditionalOrder | null>;

export function makeGetAdditionalOrder(deps: {
  additionalOrders: AdditionalOrderRepository;
}): GetAdditionalOrder {
  return (id) => deps.additionalOrders.findById(id);
}
