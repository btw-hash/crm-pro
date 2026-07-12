"use server";

import { revalidatePath } from "next/cache";
import { canAccessAccountingStage } from "@/domain/shared/role";
import { makeId } from "@/domain/shared/id";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/** Accountant has completed the paperwork → the order moves to the warehouse (in_accounting → in_warehouse). */
export async function markAccountedAction(formData: FormData): Promise<void> {
  const viewer = await resolveViewer();
  if (!viewer || !canAccessAccountingStage(viewer.role)) {
    return;
  }
  const id = String(formData.get("shipmentId") ?? "");
  if (!id) {
    return;
  }
  try {
    await getContainer().advanceAccountingShipment({ id: makeId<"ShipmentId">(id) });
  } catch {
    // already processed / not at the accounting stage / not found — ignore
  }
  revalidatePath("/accounting");
}
