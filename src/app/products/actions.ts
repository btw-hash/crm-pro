"use server";

import { revalidatePath } from "next/cache";
import { canManageProcurement } from "@/domain/shared/role";
import { DealValidationError } from "@/domain/deal/deal";
import { makeId } from "@/domain/shared/id";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import {
  ClientNotFoundForSkuError,
  SkuNotFoundError,
} from "@/application/use-cases/launch-sku-qualification";

export type GenerateDescriptionsResult =
  | { ok: true; generated: number; total: number }
  | { ok: false; error: string };

/**
 * Batch generation of AI product descriptions (#213). The catalog is curated by
 * procurement/head roles. Not realtime: triggered by a button, fills in missing
 * descriptions ahead of time. An AI service failure (LLM/network) is returned as a
 * serializable result — we don't fall through to a 500 overlay (#236).
 */
export async function generateDescriptionsAction(
  _prev: GenerateDescriptionsResult | null,
  _formData: FormData,
): Promise<GenerateDescriptionsResult> {
  const user = await requireUser();
  if (!canManageProcurement(user.role)) {
    return { ok: false, error: "Not enough permissions to generate descriptions." };
  }
  try {
    const { generated, total } = await getContainer().generateProductDescriptions();
    revalidatePath("/products");
    return { ok: true, generated, total };
  } catch {
    return {
      ok: false,
      error: "Could not generate descriptions: AI service failure. Try again later.",
    };
  }
}

export type LaunchSkuResult = { ok: true; dealId: string } | { ok: false; error: string };

/**
 * Creates a "Launch new SKU" task (#218): qualification stage, new_sku goal. Initiated by a
 * sales manager or head from the product card — an explicit signal "I'm bringing this to
 * this client", path: qualification → visit prep → audit → test → proposal.
 */
export async function launchSkuQualificationAction(
  _prev: LaunchSkuResult | null,
  formData: FormData,
): Promise<LaunchSkuResult> {
  const user = await requireUser();
  if (user.role !== "mop" && user.role !== "head") {
    return { ok: false, error: "Not enough permissions." };
  }
  const productId = String(formData.get("productId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  if (!productId) return { ok: false, error: "Product not specified." };
  if (!clientId) return { ok: false, error: "Select a client." };
  try {
    const deal = await getContainer().launchSkuQualification({
      productId: makeId<"ProductId">(productId),
      clientId: makeId<"ClientId">(clientId),
      responsibleManagerId: user.id,
    });
    revalidatePath("/deals");
    return { ok: true, dealId: deal.id };
  } catch (error) {
    if (
      error instanceof SkuNotFoundError ||
      error instanceof ClientNotFoundForSkuError ||
      error instanceof DealValidationError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
