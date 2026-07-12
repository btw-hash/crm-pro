"use server";

import { revalidatePath } from "next/cache";
import { makeId } from "@/domain/shared/id";
import type { ClientId } from "@/domain/client/client";
import { canFileAdditionalOrder } from "@/domain/shared/role";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/** Logs an add-on request outside working hours. Available to the manager and head of sales. */
export async function fileAdditionalOrderAction(formData: FormData): Promise<void> {
  const viewer = await resolveViewer();
  if (!viewer || !canFileAdditionalOrder(viewer.role)) {
    return;
  }

  const parentOrderNumber = String(formData.get("parentOrderNumber") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const shipmentDate = String(formData.get("shipmentDate") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || undefined;

  if (!parentOrderNumber || !clientId || !shipmentDate) {
    return;
  }

  const productNames = formData.getAll("productName").map(String);
  const quantities = formData.getAll("quantity").map(Number);
  const units = formData.getAll("unit").map(String);

  const lines = productNames
    .map((productName, i) => ({
      productName: productName.trim(),
      quantity: quantities[i] ?? 0,
      unit: (units[i] ?? "").trim() || "kg",
    }))
    .filter((l) => l.productName && Number.isFinite(l.quantity) && l.quantity > 0);

  if (lines.length === 0) {
    return;
  }

  try {
    await getContainer().createAdditionalOrder({
      id: makeId<"AdditionalOrderId">(crypto.randomUUID()),
      clientId: makeId<"ClientId">(clientId) as ClientId,
      parentOrderNumber,
      lines,
      shipmentDate,
      recordedBy: viewer.id,
      createdAt: new Date().toISOString(),
      note,
    });
  } catch {
    // domain validation — silently ignore (the form is guarded on the client)
  }

  revalidatePath("/shipments/additional");
}
