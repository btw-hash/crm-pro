"use server";

import { revalidatePath } from "next/cache";
import { canAccessLoadingStage } from "@/domain/shared/role";
import { makeId } from "@/domain/shared/id";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/** Marks a shipment as delivered (loading → delivered). Logistics and head of sales only. */
export async function markDeliveredAction(formData: FormData): Promise<void> {
  const viewer = await resolveViewer();
  if (!viewer || !canAccessLoadingStage(viewer.role)) {
    return;
  }
  const id = String(formData.get("shipmentId") ?? "");
  if (!id) {
    return;
  }
  try {
    await getContainer().advanceLoadingShipment({ id: makeId<"ShipmentId">(id) });
  } catch {
    // already delivered / not at the loading stage / not found — ignore
  }
  revalidatePath("/logist");
}
