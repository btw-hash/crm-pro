"use server";

import { revalidatePath } from "next/cache";
import { isDefectReason } from "@/domain/defect/defect-item";
import { makeId } from "@/domain/shared/id";
import { canManageShipments } from "@/domain/shared/role";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { formNumber } from "@/app/_lib/form-data";

/** The defect warehouse / relabeling is run by operations roles (warehouse/procurement, head of sales). */
async function opsViewer() {
  const viewer = await resolveViewer();
  return viewer && canManageShipments(viewer.role) ? viewer : null;
}

export async function advanceDefectAction(formData: FormData): Promise<void> {
  const viewer = await opsViewer();
  const id = String(formData.get("id") ?? "");
  if (viewer && id) {
    try {
      await getContainer().advanceDefectItem({ id: makeId<"DefectItemId">(id) });
    } catch {
      // already released / not found — ignore
    }
  }
  revalidatePath("/defects");
}

export async function fileDefectAction(formData: FormData): Promise<void> {
  const viewer = await opsViewer();
  if (!viewer) {
    return;
  }
  const productName = String(formData.get("productName") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  const quantity = formNumber(formData, "quantity");
  if (!productName || !isDefectReason(reason) || !Number.isFinite(quantity)) {
    return;
  }
  try {
    await getContainer().fileDefectItem({
      id: makeId<"DefectItemId">(crypto.randomUUID()),
      productName,
      quantity,
      unit: String(formData.get("unit") ?? "").trim() || undefined,
      reason,
      createdBy: viewer.id,
      createdAt: new Date().toISOString(),
      note: String(formData.get("note") ?? "").trim() || null,
    });
  } catch {
    // validation — silently ignore
  }
  revalidatePath("/defects");
}
