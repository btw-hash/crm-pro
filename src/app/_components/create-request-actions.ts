"use server";

import { revalidatePath } from "next/cache";
import type { ClientId } from "@/domain/client/client";
import type { ProductId } from "@/domain/product/product";
import { ShipmentError } from "@/domain/shipment/shipment";
import { makeId } from "@/domain/shared/id";
import { ClientNotFoundError } from "@/application/use-cases/create-deal";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

export type CreateRequestResult = { ok: true } | { ok: false; error: string };

function canCreate(role: string): boolean {
  return role === "mop" || role === "head";
}

/** Parses line items from the form: parallel arrays productId[] + quantity[]. */
function parseLines(formData: FormData): { productId: string; quantity: number }[] {
  const ids = formData.getAll("productId").map(String);
  const qtys = formData.getAll("quantity").map(Number);
  return ids
    .map((productId, i) => ({ productId: productId.trim(), quantity: qtys[i] ?? 0 }))
    .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0);
}

/** Shipment from the "New request" window (#0055): client + products + date → My shipments. */
export async function createShipmentAction(
  _prev: CreateRequestResult | null,
  formData: FormData,
): Promise<CreateRequestResult> {
  const user = await requireUser();
  if (!canCreate(user.role)) {
    return { ok: false, error: "Not enough permissions to create a shipment." };
  }
  const clientId = String(formData.get("clientId") ?? "").trim();
  const scheduledDate = String(formData.get("scheduledDate") ?? "").trim();
  if (!clientId) return { ok: false, error: "Select a client." };
  if (!scheduledDate) return { ok: false, error: "Specify the shipment date." };
  const lines = parseLines(formData);
  if (lines.length === 0) return { ok: false, error: "Add at least one line item." };
  try {
    await getContainer().createShipment({
      id: makeId<"ShipmentId">(crypto.randomUUID()),
      clientId: makeId<"ClientId">(clientId) as ClientId,
      managerId: user.id,
      orderNumber: `ORD-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      lines: lines.map((l) => ({
        productId: makeId<"ProductId">(l.productId) as ProductId,
        quantity: l.quantity,
      })),
      scheduledDate,
    });
    revalidatePath("/my-shipments");
    return { ok: true };
  } catch (error) {
    if (error instanceof ShipmentError || error instanceof ClientNotFoundError) {
      return { ok: false, error: error.message };
    }
    console.error("[createShipmentAction] failed", error);
    return { ok: false, error: "Failed to create the shipment. Please try again." };
  }
}

/** Add-on request from the "New request" window: an add-on order against a parent order. */
export async function createAdditionalOrderAction(
  _prev: CreateRequestResult | null,
  formData: FormData,
): Promise<CreateRequestResult> {
  const user = await requireUser();
  if (!canCreate(user.role)) {
    return { ok: false, error: "Not enough permissions to create an add-on request." };
  }
  const clientId = String(formData.get("clientId") ?? "").trim();
  const parentOrderNumber = String(formData.get("parentOrderNumber") ?? "").trim();
  const shipmentDate = String(formData.get("scheduledDate") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!clientId) return { ok: false, error: "Select a client." };
  if (!parentOrderNumber) return { ok: false, error: "Specify the parent order number." };
  if (!shipmentDate) return { ok: false, error: "Specify the shipment date." };

  // An add-on request stores products by name — resolve them from the catalog by the selected ids.
  const products = await getContainer().listProducts();
  const productById = new Map(products.map((p) => [String(p.id), p]));
  const lines = parseLines(formData)
    .map((l) => {
      const product = productById.get(l.productId);
      return product
        ? { productName: product.name, quantity: l.quantity, unit: product.unit }
        : null;
    })
    .filter((l): l is { productName: string; quantity: number; unit: string } => l !== null);
  if (lines.length === 0) return { ok: false, error: "Add at least one line item." };

  try {
    await getContainer().createAdditionalOrder({
      id: makeId<"AdditionalOrderId">(crypto.randomUUID()),
      clientId: makeId<"ClientId">(clientId) as ClientId,
      parentOrderNumber,
      lines,
      shipmentDate,
      recordedBy: user.id,
      createdAt: new Date().toISOString(),
      note,
    });
    revalidatePath("/shipments/additional");
    return { ok: true };
  } catch (error) {
    console.error("[createAdditionalOrderAction] failed", error);
    return { ok: false, error: "Failed to create the add-on request. Please try again." };
  }
}
