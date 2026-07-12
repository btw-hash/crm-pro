"use server";

import { revalidatePath } from "next/cache";
import { ClientValidationError } from "@/application/use-cases/create-client";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { isClientCategory } from "@/domain/client/client-category";
import { isClientType } from "@/domain/client/client-type";
import { makeId } from "@/domain/shared/id";

export type CreateClientResult = { ok: true; clientId: string } | { ok: false; error: string };

export type UpdateClientResult = { ok: true } | { ok: false; error: string };

export async function createClientAction(
  _prev: CreateClientResult | null,
  formData: FormData,
): Promise<CreateClientResult> {
  const user = await requireUser();
  if (user.role !== "mop" && user.role !== "head") {
    return { ok: false, error: "Insufficient permissions to create a client." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const ein = String(formData.get("ein") ?? "").trim();
  if (!name) return { ok: false, error: "Enter the client name." };
  try {
    const client = await getContainer().createClient({
      name,
      city: city || undefined,
      ein: ein || undefined,
      responsibleManagerId: user.id,
    });
    revalidatePath("/clients");
    return { ok: true, clientId: client.id };
  } catch (error) {
    if (error instanceof ClientValidationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function updateClientAction(
  _prev: UpdateClientResult | null,
  formData: FormData,
): Promise<UpdateClientResult> {
  const user = await requireUser();
  if (user.role !== "mop" && user.role !== "head") {
    return { ok: false, error: "Insufficient permissions to edit a client." };
  }
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const ein = String(formData.get("ein") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const category = String(formData.get("category") ?? "");
  const responsibleManagerId = String(formData.get("responsibleManagerId") ?? "").trim();
  if (!id) return { ok: false, error: "No client specified." };
  if (!name) return { ok: false, error: "Enter the client name." };
  if (!isClientType(type)) return { ok: false, error: "Invalid client type." };
  if (!isClientCategory(category)) return { ok: false, error: "Invalid client category." };
  if (!responsibleManagerId) return { ok: false, error: "Specify the responsible manager." };
  try {
    await getContainer().updateClient({
      id: makeId<"ClientId">(id),
      name,
      type,
      category,
      responsibleManagerId,
      city: city || undefined,
      ein: ein || undefined,
    });
    revalidatePath("/clients");
    revalidatePath(`/clients/${id}`);
    return { ok: true };
  } catch (error) {
    if (error instanceof ClientValidationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
