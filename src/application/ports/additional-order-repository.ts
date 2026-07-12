import type { AdditionalOrder, AdditionalOrderId } from "@/domain/shipment/additional-order";

export interface AdditionalOrderRepository {
  save(order: AdditionalOrder): Promise<void>;
  findById(id: AdditionalOrderId): Promise<AdditionalOrder | null>;
  /** All add-on requests for a shipment date (for the day's summary). */
  listByDate(shipmentDate: string): Promise<readonly AdditionalOrder[]>;
  /** Add-on requests for a specific parent request. */
  listByParent(parentOrderNumber: string): Promise<readonly AdditionalOrder[]>;
}
