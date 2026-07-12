"use server";

import { revalidatePath } from "next/cache";
import { makeId } from "@/domain/shared/id";
import { TechRequestError } from "@/domain/tech-request/tech-request";
import { isTestActResult, type TestActKind } from "@/domain/test-act/test-act";
import type { TestActDraft } from "@/application/ports/ai-gateway";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { TechRequestNotFoundError } from "@/application/use-cases/take-tech-request";
import { TestActNotFoundError } from "@/application/use-cases/send-test-act";
import { formText } from "@/app/_lib/form-data";

/**
 * Technologist's voice → act draft (AI): the transcription (STT) is already done client-side
 * via /api/act-drafts/transcribe; here the LLM lays it out into the act's fields
 * (equipment/product/dosage/parameters/result/comment). The technologist reviews and
 * edits before saving — AI doesn't invent numbers.
 */
export async function draftTechActFromVoiceAction(transcript: string): Promise<TestActDraft> {
  await requireUser();
  return getContainer().draftActFromVoice(transcript);
}

export type TechQueueActionState = { ok: true } | { ok: false; error: string };

export async function takeTechRequestAction(
  _prev: TechQueueActionState | null,
  formData: FormData,
): Promise<TechQueueActionState> {
  const requestId = String(formData.get("requestId") ?? "");
  const user = await requireUser();
  try {
    await getContainer().takeTechRequest({
      requestId: makeId<"TechRequestId">(requestId),
      technologistId: user.id,
    });
  } catch (cause) {
    // .name fallback to instanceof: under Turbopack, instanceof between "use server"/SSR
    // bundles is unreliable (different copies of the class) — otherwise a real "request
    // already taken" would fall through to a 500.
    if (
      cause instanceof TechRequestError ||
      cause instanceof TechRequestNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "TechRequestError" || cause.name === "TechRequestNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath("/tech-queue");
  return { ok: true };
}

export async function completeTechRequestAction(
  _prev: TechQueueActionState | null,
  formData: FormData,
): Promise<TechQueueActionState> {
  const requestId = String(formData.get("requestId") ?? "");
  try {
    await getContainer().completeTechRequest({
      requestId: makeId<"TechRequestId">(requestId),
    });
  } catch (cause) {
    // .name fallback to instanceof: under Turbopack, instanceof between "use server"/SSR
    // bundles is unreliable (different copies of the class) — otherwise a real "request
    // already taken" would fall through to a 500.
    if (
      cause instanceof TechRequestError ||
      cause instanceof TechRequestNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "TechRequestError" || cause.name === "TechRequestNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath("/tech-queue");
  revalidatePath("/notifications");
  return { ok: true };
}

export type SaveActState = { ok: true; actId: string } | { ok: false; error: string };

/** The technologist saves the act (without sending it to the manager). */
export async function saveTestActAction(
  _prev: SaveActState | null,
  formData: FormData,
): Promise<SaveActState> {
  const user = await requireUser();
  const dealId = formText(formData, "dealId");
  const techRequestId = formText(formData, "techRequestId");
  const actKind = (formText(formData, "actKind") ?? "workup") as TestActKind;
  const rawResult = formText(formData, "result") ?? "unknown";
  const result = isTestActResult(rawResult) ? rawResult : "unknown";
  if (result === "unknown") {
    return { ok: false, error: "Specify the result." };
  }
  if (!dealId) {
    return { ok: false, error: "Deal not specified." };
  }
  const actId = crypto.randomUUID();
  try {
    await getContainer().recordTestAct({
      id: makeId<"TestActId">(actId),
      dealId: makeId<"DealId">(dealId),
      techRequestId: techRequestId ? makeId<"TechRequestId">(techRequestId) : null,
      actKind,
      equipment: formText(formData, "equipment"),
      productName: formText(formData, "productName"),
      dosage: formText(formData, "dosage"),
      processParams: formText(formData, "processParams"),
      recommendation: formText(formData, "recommendation"),
      auditChecked: formText(formData, "auditChecked"),
      auditRemarks: formText(formData, "auditRemarks"),
      auditRecommendation: formText(formData, "auditRecommendation"),
      result,
      comment: formText(formData, "comment"),
      confirmedBy: user.id,
      confirmedAt: new Date().toISOString(),
    });
  } catch (cause) {
    if (
      cause instanceof Error &&
      (cause.name === "TestActValidationError" || cause.name === "DealNotFoundError")
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath("/tech-queue");
  revalidatePath("/deals");
  return { ok: true, actId };
}

export type SendActState = { ok: true } | { ok: false; error: string };

/** The technologist sends the act to the manager — it gets marked sentAt and the manager is notified. */
export async function sendTestActAction(
  _prev: SendActState | null,
  formData: FormData,
): Promise<SendActState> {
  const actId = formText(formData, "actId");
  if (!actId) {
    return { ok: false, error: "Act not specified." };
  }
  try {
    await getContainer().sendTestAct({
      actId: makeId<"TestActId">(actId),
      sentAt: new Date().toISOString(),
    });
  } catch (cause) {
    if (
      cause instanceof TestActNotFoundError ||
      (cause instanceof Error && cause.name === "TestActNotFoundError")
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath("/tech-queue");
  revalidatePath("/deals");
  return { ok: true };
}
