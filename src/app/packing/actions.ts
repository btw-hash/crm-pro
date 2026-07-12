"use server";

import { revalidatePath } from "next/cache";
import { makeId } from "@/domain/shared/id";
import { canManageShipments } from "@/domain/shared/role";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { formNumber } from "@/app/_lib/form-data";

/** Packing requests are run by operations roles (warehouse/procurement, head of sales). */
async function opsViewer() {
  const viewer = await resolveViewer();
  return viewer && canManageShipments(viewer.role) ? viewer : null;
}

export async function advancePackingAction(formData: FormData): Promise<void> {
  const viewer = await opsViewer();
  const id = String(formData.get("id") ?? "");
  if (viewer && id) {
    try {
      await getContainer().advancePackingRequest({ id: makeId<"PackingRequestId">(id) });
    } catch {
      // already done / not found — ignore
    }
  }
  revalidatePath("/packing");
}

export async function filePackingAction(formData: FormData): Promise<void> {
  const viewer = await opsViewer();
  if (!viewer) {
    return;
  }
  const productName = String(formData.get("productName") ?? "").trim();
  const sourcePack = String(formData.get("sourcePack") ?? "").trim();
  const targetPack = String(formData.get("targetPack") ?? "").trim();
  const quantity = formNumber(formData, "quantity");
  if (!productName || !sourcePack || !targetPack || !Number.isFinite(quantity)) {
    return;
  }
  try {
    await getContainer().filePackingRequest({
      id: makeId<"PackingRequestId">(crypto.randomUUID()),
      productName,
      sourcePack,
      targetPack,
      quantity,
      unit: String(formData.get("unit") ?? "").trim() || undefined,
      requestedBy: viewer.id,
      createdAt: new Date().toISOString(),
    });
  } catch {
    // validation — silently ignore
  }
  revalidatePath("/packing");
}
