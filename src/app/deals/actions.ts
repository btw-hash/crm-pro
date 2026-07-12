"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { DealNotFoundError } from "@/application/use-cases/advance-deal-stage";
import { AssignDealManagerError } from "@/application/use-cases/assign-deal-manager";
import { ClientNotFoundError } from "@/application/use-cases/create-deal";
import { ClientValidationError } from "@/application/use-cases/create-client";
import { DealStageRevertError } from "@/application/use-cases/revert-deal-stage";
import { type ActivityKind, isActivityKind } from "@/domain/activity/activity";
import { type Deal, DealStageTransitionError, DealValidationError } from "@/domain/deal/deal";
import { isDealGoal } from "@/domain/deal/deal-goal";
import { isDealType } from "@/domain/deal/deal-type";
import type { DealStage } from "@/domain/deal/deal-stage";
import { makeId } from "@/domain/shared/id";
import { requireUser, resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { canAssignToManager } from "./_lib/deal-access";

type AdvanceStageResult = { ok: true; deal: Deal } | { ok: false; error: string };
type RevertStageResult = { ok: true; deal: Deal } | { ok: false; error: string };

/**
 * Server action for moving a deal to a new stage.
 * Thin layer: validates input, calls the use-case via composition-root, returns
 * domain errors as a serializable result (not a 500), revalidates /deals.
 */
export async function advanceStageAction(input: {
  dealId: string;
  to: DealStage;
}): Promise<AdvanceStageResult> {
  // Owner boundary: a manager can only move their own deals (same check as in
  // getDealWorkspace); head of sales/technologist — any deal. A server action is a
  // direct POST bypassing the UI gate.
  const viewer = await resolveViewer();
  if (!viewer) {
    return { ok: false, error: "No access." };
  }
  // An empty id used to make makeId throw a plain Error → a 500 on a direct POST
  // bypassing the UI.
  if (!input.dealId.trim()) {
    return { ok: false, error: "No deal id specified." };
  }
  const dealId = makeId<"DealId">(input.dealId);
  if (!(await getContainer().getDealWorkspace(dealId, viewer))) {
    return { ok: false, error: "Deal not accessible." };
  }
  try {
    const deal = await getContainer().advanceDealStage({
      dealId,
      to: input.to,
      actor: viewer.id,
    });
    revalidatePath("/deals");
    // And the deal's own page: otherwise it's served from cache with the old stage
    // and the next stage's sections don't unlock (sectionVisibility computes from stage).
    revalidatePath(`/deals/${input.dealId}`);
    return { ok: true, deal };
  } catch (error) {
    if (error instanceof DealStageTransitionError || error instanceof DealNotFoundError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export async function revertStageAction(input: {
  dealId: string;
  toStage: DealStage;
  reason?: string;
}): Promise<RevertStageResult> {
  // Owner boundary (same as advanceStageAction): a manager can only revert their own deals.
  // A server action is a direct POST bypassing the UI gate, so we check here.
  const viewer = await resolveViewer();
  if (!viewer) {
    return { ok: false, error: "No access." };
  }
  // An empty id used to make makeId throw a plain Error → a 500 on a direct POST
  // bypassing the UI.
  if (!input.dealId.trim()) {
    return { ok: false, error: "No deal id specified." };
  }
  const dealId = makeId<"DealId">(input.dealId);
  if (!(await getContainer().getDealWorkspace(dealId, viewer))) {
    return { ok: false, error: "Deal not accessible." };
  }
  try {
    const deal = await getContainer().revertDealStage({
      dealId,
      toStage: input.toStage,
      reason: input.reason,
      revertedBy: viewer.id,
    });
    revalidatePath("/deals");
    revalidatePath(`/deals/${input.dealId}`);
    return { ok: true, deal };
  } catch (error) {
    if (error instanceof DealStageRevertError || error instanceof DealNotFoundError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export type DealMutationResult = { ok: true } | { ok: false; error: string };

export async function createDealAction(
  _prev: DealMutationResult | null,
  formData: FormData,
): Promise<DealMutationResult> {
  const user = await requireUser();
  if (user.role !== "mop" && user.role !== "head") {
    return { ok: false, error: "Not enough permissions to create a deal." };
  }
  let clientId = String(formData.get("clientId") ?? "").trim();
  const newClientName = String(formData.get("newClientName") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const goalRaw = String(formData.get("goal") ?? "");
  const typeRaw = String(formData.get("type") ?? "");
  const responsibleManagerId = String(formData.get("responsibleManagerId") ?? "").trim();
  const comment = String(formData.get("comment") ?? "").trim();

  if (!clientId && newClientName) {
    // Inline create: create the client first, then use its id
    const newClientCity = String(formData.get("newClientCity") ?? "").trim();
    const newClientInn = String(formData.get("newClientInn") ?? "").trim();
    try {
      const created = await getContainer().createClient({
        name: newClientName,
        city: newClientCity || undefined,
        ein: newClientInn || undefined,
        responsibleManagerId,
      });
      clientId = created.id;
      revalidatePath("/clients");
    } catch (error) {
      if (error instanceof ClientValidationError) {
        return { ok: false, error: error.message };
      }
      // An unwrapped throw from a server action in React 19 doesn't reset the pending
      // state in useActionState → the form hangs on "Saving…" (#393, item 12). We return
      // an error instead (pending resets), but log loudly — a failure shouldn't be silent.
      console.error("[createDealAction] createClient failed", error);
      return { ok: false, error: "Could not create the client. Please try again." };
    }
  }

  if (!clientId) return { ok: false, error: "Select a client." };
  if (!title) return { ok: false, error: "Specify a deal title." };
  if (!responsibleManagerId) return { ok: false, error: "Specify who's responsible." };
  // RBAC #27: a manager can only assign a deal to themself (not to other managers);
  // the head of sales — to anyone. A server action is a direct POST bypassing the UI's
  // narrowed dropdown.
  if (!canAssignToManager(user, responsibleManagerId)) {
    return { ok: false, error: "You can only assign the deal to yourself." };
  }
  try {
    await getContainer().createDeal({
      clientId: makeId<"ClientId">(clientId),
      title,
      responsibleManagerId,
      goal: isDealGoal(goalRaw) ? goalRaw : undefined,
      type: isDealType(typeRaw) ? typeRaw : undefined,
      comment: comment || undefined,
    });
    revalidatePath("/deals");
    return { ok: true };
  } catch (error) {
    if (error instanceof DealValidationError || error instanceof ClientNotFoundError) {
      return { ok: false, error: error.message };
    }
    // See above: don't throw outward, or the form hangs on "Saving…" (#393, item 12).
    console.error("[createDealAction] createDeal failed", error);
    return { ok: false, error: "Could not create the deal. Please try again." };
  }
}

export async function updateDealAction(
  _prev: DealMutationResult | null,
  formData: FormData,
): Promise<DealMutationResult> {
  const user = await requireUser();
  const dealId = String(formData.get("dealId") ?? "").trim();
  const clientId = String(formData.get("clientId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const goalRaw = String(formData.get("goal") ?? "");
  const responsibleManagerId = String(formData.get("responsibleManagerId") ?? "").trim();
  const commentRaw = formData.get("comment");
  if (!dealId) return { ok: false, error: "No deal id specified." };
  const container = getContainer();
  const existing = await container.listDeals(user).then((ds) => ds.find((d) => d.id === dealId));
  if (!existing) return { ok: false, error: "Deal not found." };
  if (user.role !== "head" && existing.responsibleManagerId !== user.id) {
    return { ok: false, error: "Not enough permissions to edit this deal." };
  }
  // RBAC #27: when changing the responsible manager, a manager can only assign to themself.
  if (responsibleManagerId && !canAssignToManager(user, responsibleManagerId)) {
    return { ok: false, error: "You can only assign the deal to yourself." };
  }
  try {
    await container.updateDeal({
      dealId: makeId<"DealId">(dealId),
      clientId: clientId ? makeId<"ClientId">(clientId) : undefined,
      title: title || undefined,
      responsibleManagerId: responsibleManagerId || undefined,
      goal: isDealGoal(goalRaw) ? goalRaw : undefined,
      // null/undefined from formData → don't touch; the field being present (even
      // empty) → update it.
      comment: commentRaw === null ? undefined : String(commentRaw),
    });
    revalidatePath("/deals");
    revalidatePath(`/deals/${dealId}`);
    return { ok: true };
  } catch (error) {
    if (
      error instanceof DealValidationError ||
      error instanceof ClientNotFoundError ||
      error instanceof DealNotFoundError
    ) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

export type QuickActivityResult = { ok: true } | { ok: false; error: string };

/** `YYYY-MM-DD` date → an ISO timestamp for `createdAt`. Today — the current moment
 * (an exact feed), another date — noon of that day (no shift to a neighboring UTC day). */
function toCreatedAt(date: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return date === today ? new Date().toISOString() : `${date}T12:00:00.000Z`;
}

/**
 * Quick-logs an activity/next step right from the board (REQ-2, #157), without
 * navigating to the card. Thin layer: owner boundary (a manager — only their own deals,
 * as in advanceStageAction), reuses the domain's `recordActivity`, returns domain
 * rejections as a serializable result. `task` = a next step (with a `dueDate`).
 */
export async function recordQuickActivityAction(input: {
  dealId: string;
  clientId: string;
  kind: ActivityKind;
  text: string;
  date: string;
}): Promise<QuickActivityResult> {
  const viewer = await resolveViewer();
  if (!viewer) {
    return { ok: false, error: "No access." };
  }
  // An empty id used to make makeId throw a plain Error → a 500 on a direct POST
  // bypassing the UI.
  if (!input.dealId.trim()) {
    return { ok: false, error: "No deal id specified." };
  }
  const dealId = makeId<"DealId">(input.dealId);
  if (!(await getContainer().getDealWorkspace(dealId, viewer))) {
    return { ok: false, error: "Deal not accessible." };
  }
  if (!isActivityKind(input.kind)) {
    return { ok: false, error: "Unknown task type." };
  }
  const body = input.text.trim();
  if (!body) {
    return { ok: false, error: "Describe what happened." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Specify a valid date." };
  }
  await getContainer().recordActivity({
    id: makeId<"ActivityId">(crypto.randomUUID()),
    dealId,
    clientId: input.clientId ? makeId<"ClientId">(input.clientId) : null,
    kind: input.kind,
    text: body,
    author: viewer.id,
    createdAt: toCreatedAt(input.date),
    dueDate: input.kind === "task" ? input.date : null,
  });
  revalidatePath("/deals");
  return { ok: true };
}

export type AssignManagerResult = { ok: true } | { ok: false; error: string };

/**
 * Reassigns a deal to another manager. Available only to the head of sales.
 * Creates a notification for the new responsible manager via the existing Notifier.
 */
export async function assignManagerAction(input: {
  dealId: string;
  newManagerId: string;
}): Promise<AssignManagerResult> {
  const viewer = await resolveViewer();
  if (!viewer) {
    return { ok: false, error: "No access." };
  }
  if (viewer.role !== "head") {
    return { ok: false, error: "Only the head of sales can reassign a deal." };
  }
  const dealId = makeId<"DealId">(input.dealId);
  const newManagerId = input.newManagerId.trim();
  if (!newManagerId) {
    return { ok: false, error: "Specify a manager." };
  }
  try {
    await getContainer().assignDealManager({
      dealId,
      newManagerId,
      actorRole: viewer.role,
      actorId: viewer.id,
    });
    revalidatePath("/deals");
    revalidatePath(`/deals/${input.dealId}`);
    return { ok: true };
  } catch (cause) {
    if (cause instanceof AssignDealManagerError || cause instanceof DealNotFoundError) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
}

export async function deleteDealAction(dealId: string): Promise<void> {
  const user = await requireUser();
  const container = getContainer();
  const existing = await container.listDeals(user).then((ds) => ds.find((d) => d.id === dealId));
  if (!existing) return;
  if (user.role !== "head" && existing.responsibleManagerId !== user.id) {
    return;
  }
  // Soft delete (#397 item 23): the record and its history are kept, a deal_deleted event fires.
  await container.deleteDeal({
    dealId: makeId<"DealId">(dealId),
    actor: user.id,
    at: new Date().toISOString(),
  });
  revalidatePath("/deals");
  redirect("/deals");
}
