"use server";

import { revalidatePath } from "next/cache";
import { canViewMyShipments } from "@/domain/shared/role";
import { makeId } from "@/domain/shared/id";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/**
 * Cancel a shipment by its owner (manager/head of sales). The owner boundary and
 * "can't cancel a delivered shipment" live in the use-case/domain; here we only
 * do the role gate and revalidate. Errors are swallowed (someone else's / already
 * delivered / not found) — the UI simply won't show the change.
 */
export async function cancelMyShipmentAction(formData: FormData): Promise<void> {
  const viewer = await resolveViewer();
  if (!viewer || !canViewMyShipments(viewer.role)) {
    return;
  }
  const id = String(formData.get("shipmentId") ?? "");
  if (!id) {
    return;
  }
  try {
    await getContainer().cancelMyShipment({
      id: makeId<"ShipmentId">(id),
      managerId: viewer.id,
    });
  } catch {
    // someone else's / already delivered / not found — ignore
  }
  revalidatePath("/my-shipments");
}
