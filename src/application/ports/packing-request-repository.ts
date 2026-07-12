import type { PackingRequest, PackingRequestId } from "@/domain/packing/packing-request";

export interface PackingRequestRepository {
  save(request: PackingRequest): Promise<void>;
  findById(id: PackingRequestId): Promise<PackingRequest | null>;
  /** All packing requests, newest first. */
  list(): Promise<readonly PackingRequest[]>;
}
