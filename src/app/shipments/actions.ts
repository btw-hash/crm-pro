"use server";

import { revalidatePath } from "next/cache";
import { canManageShipments } from "@/domain/shared/role";
import { makeId } from "@/domain/shared/id";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/** Advances a shipment to the next stage. Available to operational roles (warehouse/procurement, head). */
export async function advanceShipmentAction(formData: FormData): Promise<void> {
  const viewer = await resolveViewer();
  if (!viewer || !canManageShipments(viewer.role)) {
    return;
  }
  const id = String(formData.get("shipmentId") ?? "");
  if (!id) {
    return;
  }
  try {
    await getContainer().advanceShipment({ id: makeId<"ShipmentId">(id) });
  } catch {
    // already delivered / not found — ignore
  }
  revalidatePath("/shipments");
}
