"use server";

import { revalidatePath } from "next/cache";
import type { ActivityDraft, TestActDraft } from "@/application/ports/ai-gateway";
import { DealNotFoundError } from "@/application/use-cases/advance-deal-stage";
import { ProductNotFoundError } from "@/application/use-cases/build-proposal-draft";
import { ErpWriteError } from "@/application/ports/erp-gateway";
import {
  CreditLimitExceededError,
  CustomerOrderValidationError,
  DealNotCompletedError,
} from "@/application/use-cases/place-customer-order";
import {
  InsufficientStockError,
  SampleRequestStageError,
} from "@/application/use-cases/request-sample";
import {
  TechRequestError,
  type TechRequestKind,
  type ConsultFormat,
  type DemoLocation,
} from "@/domain/tech-request/tech-request";
import { ClientNotFoundError } from "@/application/use-cases/create-deal";
import type { UpdateDealInput } from "@/application/use-cases/update-deal";
import { ActivityNotFoundError, NotATaskError } from "@/application/use-cases/complete-task";
import { type ActivityKind, isActivityKind } from "@/domain/activity/activity";
import {
  AuditNotFoundError,
  ProductionAuditValidationError,
} from "@/domain/audit/production-audit";
import type { AuditId } from "@/domain/audit/production-audit";
import { DealQualificationValidationError } from "@/domain/deal/deal-qualification";
import type { DealQualificationId } from "@/domain/deal/deal-qualification";
import {
  SampleRequestNotFoundError,
  SampleRequestValidationError,
} from "@/domain/sample/sample-request";
import {
  DealOutcomeError,
  DealStageTransitionError,
  DealValidationError,
} from "@/domain/deal/deal";
import type { DealOutcome } from "@/domain/deal/deal-stage";
import { isDealGoal } from "@/domain/deal/deal-goal";
import { Money } from "@/domain/pricing/money";
import { ProposalValidationError } from "@/domain/proposal/proposal";
import { isProposalStatus, SavedProposalValidationError } from "@/domain/proposal/saved-proposal";
import { makeId } from "@/domain/shared/id";
import {
  isTestActResult,
  TestActValidationError,
  type TestActResult,
} from "@/domain/test-act/test-act";
import { formLines, formNumber, formText } from "@/app/_lib/form-data";
import { canSeeMargin } from "@/domain/shared/role";
import type { Viewer } from "@/domain/shared/viewer";
import { requireUser, resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { seedTechnologistIds } from "@/infrastructure/persistence/seed";
import { canAssignToManager } from "../_lib/deal-access";

/**
 * Access to a deal for a server-action: the head of sales and technologist — to any
 * deal (shared test queue), a sales manager — only their own. The same owner boundary
 * as in getDealWorkspace; needed because a server-action is a separate POST endpoint
 * called directly, bypassing the UI gate (the read boundary on the page doesn't protect
 * a direct POST with someone else's dealId). Returns the viewer if access is granted,
 * otherwise null.
 */
async function dealAccess(dealId: string): Promise<Viewer | null> {
  const viewer = await resolveViewer();
  if (!viewer) {
    return null;
  }
  const workspace = await getContainer().getDealWorkspace(makeId<"DealId">(dealId), viewer);
  return workspace ? viewer : null;
}

/**
 * Access to COMMERCIAL actions on a deal (proposal with prices, ERP order, client
 * message, advisor): access to the deal AND the right to see commercial data. The
 * technologist is cut off by canSeeMargin, another manager's deal — by the owner
 * boundary inside dealAccess.
 */
async function commercialDealAccess(dealId: string): Promise<boolean> {
  const viewer = await dealAccess(dealId);
  return viewer !== null && canSeeMargin(viewer.role);
}

const NO_ACCESS = "Action unavailable: you don't have permission for this deal.";

export type SaveAuditResult = { ok: true } | { ok: false; error: string };

export async function saveAuditAction(
  _prev: SaveAuditResult | null,
  formData: FormData,
): Promise<SaveAuditResult> {
  const dealId = String(formData.get("dealId") ?? "");
  const viewer = await dealAccess(dealId);
  if (!viewer) {
    return { ok: false, error: NO_ACCESS };
  }
  const clientId = String(formData.get("clientId") ?? "");
  try {
    await getContainer().saveProductionAudit({
      id: makeId<"AuditId">(crypto.randomUUID()),
      dealId: makeId<"DealId">(dealId),
      clientId: makeId<"ClientId">(clientId),
      equipment: formLines(formData, "equipment"),
      painPoints: formLines(formData, "painPoints"),
      createdBy: viewer.id,
      createdAt: new Date().toISOString(),
    });
  } catch (cause) {
    // Domain input rejection (empty audit / no deal) → inline error, not a 500 overlay.
    // Also match by name: under Turbopack, instanceof between "use server"/SSR bundles is unreliable.
    if (
      cause instanceof ProductionAuditValidationError ||
      cause instanceof DealNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "ProductionAuditValidationError" || cause.name === "DealNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export type UpdateAuditResult = { ok: true } | { ok: false; error: string };

export async function updateAuditAction(
  _prev: UpdateAuditResult | null,
  formData: FormData,
): Promise<UpdateAuditResult> {
  const dealId = String(formData.get("dealId") ?? "");
  const viewer = await dealAccess(dealId);
  if (!viewer) {
    return { ok: false, error: NO_ACCESS };
  }
  const auditId = String(formData.get("auditId") ?? "") as AuditId;
  if (!auditId) {
    return { ok: false, error: "The audit ID is missing." };
  }
  try {
    await getContainer().updateProductionAudit({
      auditId: makeId<"AuditId">(auditId),
      equipment: formLines(formData, "equipment"),
      painPoints: formLines(formData, "painPoints"),
    });
  } catch (cause) {
    if (
      cause instanceof ProductionAuditValidationError ||
      cause instanceof AuditNotFoundError ||
      cause instanceof DealNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "ProductionAuditValidationError" ||
          cause.name === "AuditNotFoundError" ||
          cause.name === "DealNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export async function recordActAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await dealAccess(dealId))) {
    return;
  }
  const rawResult = String(formData.get("result") ?? "unknown");
  const result: TestActResult = isTestActResult(rawResult) ? rawResult : "unknown";
  try {
    await getContainer().recordTestAct({
      id: makeId<"TestActId">(crypto.randomUUID()),
      dealId: makeId<"DealId">(dealId),
      clientName: formText(formData, "clientName"),
      equipment: formText(formData, "equipment"),
      productName: formText(formData, "productName"),
      dosage: formText(formData, "dosage"),
      processParams: formText(formData, "processParams"),
      result,
      comment: formText(formData, "comment"),
      confirmedBy: (await requireUser()).id,
      confirmedAt: new Date().toISOString(),
    });
  } catch (cause) {
    // The UI form (success/failure select) can't send an invalid act; a domain rejection
    // is only reachable via a direct POST bypassing the UI → we don't crash with a 500
    // overlay, we silently ignore "our own" rejection (instanceof + .name under Turbopack),
    // and rethrow anything unknown.
    if (
      cause instanceof TestActValidationError ||
      cause instanceof DealNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "TestActValidationError" || cause.name === "DealNotFoundError"))
    ) {
      return;
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
}

/** AI-drafted act from a voice transcript. Returned to the client for editing. */
export async function draftActFromVoiceAction(transcript: string): Promise<TestActDraft> {
  return getContainer().draftActFromVoice(transcript);
}

/** AI-drafted activity from a voice transcript. Returned to the client for editing (#93). */
export async function draftActivityFromVoiceAction(transcript: string): Promise<ActivityDraft> {
  return getContainer().draftActivityFromVoice(transcript);
}

/**
 * Saves an activity from a voice draft + an optional "next step" task (#93).
 * A human sets the task date (AI never invents it).
 */
export async function recordVoiceActivityAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await dealAccess(dealId))) {
    return;
  }
  const clientId = String(formData.get("clientId") ?? "");
  const body = formText(formData, "text");
  if (!body) {
    return; // don't save an empty activity
  }
  const rawKind = String(formData.get("kind") ?? "note");
  const kind: ActivityKind = isActivityKind(rawKind) ? rawKind : "note";
  const author = (await requireUser()).id;
  const now = new Date().toISOString();
  const container = getContainer();
  await container.recordActivity({
    id: makeId<"ActivityId">(crypto.randomUUID()),
    dealId: makeId<"DealId">(dealId),
    clientId: clientId ? makeId<"ClientId">(clientId) : null,
    kind,
    text: body,
    author,
    createdAt: now,
    dueDate: kind === "task" ? formText(formData, "dueDate") : null,
  });
  const nextStep = formText(formData, "nextStepText");
  if (nextStep) {
    await container.recordActivity({
      id: makeId<"ActivityId">(crypto.randomUUID()),
      dealId: makeId<"DealId">(dealId),
      clientId: clientId ? makeId<"ClientId">(clientId) : null,
      kind: "task",
      text: nextStep,
      author,
      createdAt: now,
      dueDate: formText(formData, "nextStepDueDate"),
    });
  }
  revalidatePath(`/deals/${dealId}`);
}

/** Sets the deal's goal (#37). */
export async function setDealGoalAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const goal = String(formData.get("goal") ?? "");
  if (!dealId || !isDealGoal(goal)) {
    return;
  }
  const viewer = await dealAccess(dealId);
  if (!viewer) {
    return;
  }
  await getContainer().setDealGoal({ dealId: makeId<"DealId">(dealId), goal, actor: viewer.id });
  revalidatePath(`/deals/${dealId}`);
}

/** Records the outcome of a completed deal (Won/Lost) (#397 [24]). */
export async function setDealOutcomeAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  if (!dealId || (outcome !== "won" && outcome !== "lost")) {
    return;
  }
  if (!(await dealAccess(dealId))) {
    return;
  }
  const value: DealOutcome = outcome === "won" ? "won" : "lost";
  try {
    await getContainer().setDealOutcome({
      dealId: makeId<"DealId">(dealId),
      outcome: value,
      actor: (await requireUser()).id,
    });
  } catch (cause) {
    // The outcome is only set at "Completed" (the buttons only appear there anyway) —
    // we swallow the domain error, revalidate refreshes the UI; we rethrow infrastructure
    // errors, never hiding real bugs.
    if (
      !(
        cause instanceof DealOutcomeError ||
        (cause instanceof Error && cause.name === "DealOutcomeError")
      )
    ) {
      throw cause;
    }
  }
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
}

/** "Overview" fields editable in place (inline, REQ-5/#158). */
export type InlineDealField = "title" | "goal" | "responsibleManagerId";

export type InlineUpdateDealResult = { ok: true } | { ok: false; error: string };

/**
 * Inline edit of a single field on the "Overview" (REQ-5/#158): click a value →
 * input → Enter saves. A thin layer: the owner boundary (a manager — only their own
 * deals, as in updateDealAction), reuses the domain `updateDeal` use-case (doesn't
 * duplicate the logic), returns domain rejections as a serializable result (not a 500).
 */
export async function inlineUpdateDealAction(input: {
  dealId: string;
  field: InlineDealField;
  value: string;
}): Promise<InlineUpdateDealResult> {
  const viewer = await resolveViewer();
  if (!viewer) {
    return { ok: false, error: NO_ACCESS };
  }
  const dealId = makeId<"DealId">(input.dealId);
  if (!(await getContainer().getDealWorkspace(dealId, viewer))) {
    return { ok: false, error: NO_ACCESS };
  }
  // Narrow per-field parsing: the domain only accepts valid values.
  let patch: UpdateDealInput;
  if (input.field === "title") {
    const title = input.value.trim();
    if (!title) {
      return { ok: false, error: "The deal title cannot be empty." };
    }
    patch = { dealId, title };
  } else if (input.field === "goal") {
    if (!isDealGoal(input.value)) {
      return { ok: false, error: "Unknown deal goal." };
    }
    patch = { dealId, goal: input.value };
  } else {
    const managerId = input.value.trim();
    if (!managerId) {
      return { ok: false, error: "Specify the person responsible." };
    }
    // RBAC #27: a sales manager can only reassign a deal to themselves; the head of sales — to anyone.
    if (!canAssignToManager(viewer, managerId)) {
      return { ok: false, error: "You can only assign the deal to yourself." };
    }
    patch = { dealId, responsibleManagerId: managerId };
  }
  try {
    await getContainer().updateDeal(patch);
    revalidatePath("/deals");
    revalidatePath(`/deals/${input.dealId}`);
    return { ok: true };
  } catch (cause) {
    if (cause instanceof DealValidationError || cause instanceof ClientNotFoundError) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
}

export type SampleRequestState = { ok: true } | { ok: false; error: string };

/** Sample request: reserves a test batch + moves the deal to "Sample request" (#35). */
export async function requestSampleAction(
  _prev: SampleRequestState | null,
  formData: FormData,
): Promise<SampleRequestState> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await dealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const productId = String(formData.get("productId") ?? "");
  if (!productId) {
    return { ok: false, error: "Select a product for the test." };
  }
  const quantity = formNumber(formData, "quantity");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Specify a quantity greater than zero." };
  }
  try {
    await getContainer().requestSample({
      id: makeId<"SampleRequestId">(crypto.randomUUID()),
      dealId: makeId<"DealId">(dealId),
      productId: makeId<"ProductId">(productId),
      quantity,
      requestedBy: (await requireUser()).id,
      requestedAt: new Date().toISOString(),
    });
  } catch (cause) {
    if (
      cause instanceof InsufficientStockError ||
      cause instanceof SampleRequestStageError ||
      cause instanceof DealNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "InsufficientStockError" ||
          cause.name === "SampleRequestStageError" ||
          cause.name === "DealNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export type UpdateSampleResult = { ok: true } | { ok: false; error: string };

export async function updateSampleAction(
  _prev: UpdateSampleResult | null,
  formData: FormData,
): Promise<UpdateSampleResult> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await dealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const sampleId = String(formData.get("sampleId") ?? "");
  if (!sampleId) {
    return { ok: false, error: "The request ID is missing." };
  }
  const quantity = formNumber(formData, "quantity");
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "Specify a quantity greater than zero." };
  }
  try {
    await getContainer().updateSampleRequest({
      sampleId: makeId<"SampleRequestId">(sampleId),
      quantity,
    });
  } catch (cause) {
    if (
      cause instanceof SampleRequestNotFoundError ||
      cause instanceof SampleRequestValidationError ||
      (cause instanceof Error &&
        (cause.name === "SampleRequestNotFoundError" ||
          cause.name === "SampleRequestValidationError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

export async function recordActivityAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await dealAccess(dealId))) {
    return;
  }
  const clientId = String(formData.get("clientId") ?? "");
  const body = formText(formData, "text");
  if (!body) {
    return; // don't save an empty activity
  }
  const rawKind = String(formData.get("kind") ?? "note");
  const kind: ActivityKind = isActivityKind(rawKind) ? rawKind : "note";
  await getContainer().recordActivity({
    id: makeId<"ActivityId">(crypto.randomUUID()),
    dealId: makeId<"DealId">(dealId),
    clientId: clientId ? makeId<"ClientId">(clientId) : null,
    kind,
    text: body,
    author: (await requireUser()).id,
    createdAt: new Date().toISOString(),
    dueDate: kind === "task" ? formText(formData, "dueDate") : null,
  });
  revalidatePath(`/deals/${dealId}`);
}

export type ClientMessageState =
  | { ok: true; subject: string; body: string }
  | { ok: false; error: string };

/** AI-drafted client message based on the deal context. Returned for editing (#101). */
export async function draftClientMessageAction(
  dealId: string,
  intent: string,
): Promise<ClientMessageState> {
  if (!(await commercialDealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const container = getContainer();
  try {
    const { subject, body } = await container.draftClientMessage({
      dealId: makeId<"DealId">(dealId),
      intent,
    });
    return { ok: true, subject, body };
  } catch (cause) {
    if (cause instanceof DealNotFoundError) {
      return { ok: false, error: "Deal not found." };
    }
    container.logger.error("draft_client_message.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return { ok: false, error: "Could not generate the message. Please try again." };
  }
}

export type NextStepState = { ok: true; suggestion: string } | { ok: false; error: string };

/** AI suggestion for the next step on a stalled deal. Returned to the client for editing (#97). */
export async function suggestNextStepAction(dealId: string): Promise<NextStepState> {
  if (!(await commercialDealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const container = getContainer();
  try {
    const { suggestion } = await container.suggestNextStep({ dealId: makeId<"DealId">(dealId) });
    return { ok: true, suggestion };
  } catch (cause) {
    if (cause instanceof DealNotFoundError) {
      return { ok: false, error: "Deal not found." };
    }
    container.logger.error("suggest_next_step.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return { ok: false, error: "Could not get a suggestion. Please try again." };
  }
}

export type PlaceOrderState =
  | { ok: true; orderNumber: string; idempotent: boolean }
  | { ok: false; error: string; overLimit?: boolean };

/** Creates a "Purchase order" in the ERP for a won deal (stubbed; real ERP — #1). */
export async function placeOrderAction(
  _prev: PlaceOrderState | null,
  formData: FormData,
): Promise<PlaceOrderState> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await commercialDealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  // Order lines: a multiline `lines` field (JSON [{productId, quantity}], prefilled from the
  // proposal) with backward compatibility for the single productId/quantity fields.
  const linesRaw = String(formData.get("lines") ?? "");
  let rawLines: { productId: string; quantity: number }[] = [];
  if (linesRaw) {
    try {
      rawLines = JSON.parse(linesRaw) as typeof rawLines;
    } catch {
      return { ok: false, error: "Invalid order line format." };
    }
  } else {
    const productId = String(formData.get("productId") ?? "");
    rawLines = productId ? [{ productId, quantity: formNumber(formData, "quantity") }] : [];
  }
  const orderLines = rawLines
    .filter((l) => l.productId && Number.isFinite(l.quantity) && l.quantity > 0)
    .map((l) => ({ productId: makeId<"ProductId">(l.productId), quantity: l.quantity }));
  if (orderLines.length === 0) {
    return { ok: false, error: "Add at least one line item with a quantity greater than zero." };
  }
  const shipmentDate = String(formData.get("shipmentDate") ?? "");
  const allowOverLimit = formData.get("allowOverLimit") != null;
  const actor = (await requireUser()).id;
  try {
    const result = await getContainer().placeCustomerOrder({
      dealId: makeId<"DealId">(dealId),
      lines: orderLines,
      shipmentDate,
      allowOverLimit,
      actorId: actor,
    });
    revalidatePath("/shipments");
    revalidatePath("/my-shipments");
    revalidatePath(`/deals/${dealId}`);
    return { ok: true, orderNumber: result.orderNumber, idempotent: result.idempotent };
  } catch (cause) {
    if (cause instanceof CreditLimitExceededError) {
      // Return a flag — the UI shows a warning and an "place order over the limit" checkbox.
      return { ok: false, error: cause.message, overLimit: true };
    }
    if (
      cause instanceof DealNotCompletedError ||
      cause instanceof CustomerOrderValidationError ||
      cause instanceof DealNotFoundError ||
      cause instanceof ErpWriteError
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
}

export type TechRequestState = { ok: true } | { ok: false; error: string };

/** Tech request: request a consultation/demo/audit for a deal (#460). */
export async function requestTechAction(
  _prev: TechRequestState | null,
  formData: FormData,
): Promise<TechRequestState> {
  const dealId = String(formData.get("dealId") ?? "");
  // RBAC #8: a server-action is a direct POST bypassing the UI gate; we check access to
  // the deal (a sales manager — only their own via the getDealWorkspace owner boundary, as
  // in the other actions).
  if (!(await dealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const kind = String(formData.get("kind") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const dealTitle = String(formData.get("dealTitle") ?? "");
  const deadline = formText(formData, "deadline");
  const consultFormat = formText(formData, "consultFormat");
  const demoLocation = formText(formData, "demoLocation");
  const demoAddress = formText(formData, "demoAddress");
  const demoProducts = formText(formData, "demoProducts");
  const auditFocus = formText(formData, "auditFocus");

  // Products are required for demo; a note is required for consult and audit_req.
  const mainField = kind === "demo" ? demoProducts : note;
  if (!mainField) {
    return {
      ok: false,
      error: kind === "demo" ? "Specify the products for the trial." : "Add a note to the request.",
    };
  }
  // For demo, note can be empty — fall back to the products list as the note if there's no separate note.
  const effectiveNote = note || demoProducts || "";

  const actor = (await requireUser()).id;
  try {
    const container = getContainer();
    await container.createTechRequest({
      id: makeId<"TechRequestId">(crypto.randomUUID()),
      dealId: makeId<"DealId">(dealId),
      clientId: makeId<"ClientId">(clientId),
      kind: kind as TechRequestKind,
      note: effectiveNote,
      requestedBy: actor,
      createdAt: new Date().toISOString(),
      dealTitle,
      technologistIds: seedTechnologistIds,
      deadline: deadline || null,
      consultFormat: consultFormat ? (consultFormat as ConsultFormat) : null,
      demoLocation: demoLocation ? (demoLocation as DemoLocation) : null,
      demoAddress: demoAddress || null,
      demoProducts: demoProducts || null,
      auditFocus: auditFocus || null,
    });
    // #460: sending the request moves the deal "Tech request" → "Tech response"
    // (audit → testing). If the deal is no longer at that stage — the transition is
    // rejected, the request is still created (best-effort, we don't fail the action).
    try {
      await container.advanceDealStage({ dealId: makeId<"DealId">(dealId), to: "testing", actor });
    } catch (cause) {
      if (
        !(
          cause instanceof DealStageTransitionError ||
          (cause instanceof Error && cause.name === "DealStageTransitionError")
        )
      ) {
        throw cause;
      }
    }
  } catch (cause) {
    if (cause instanceof TechRequestError) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/tech-queue");
  return { ok: true };
}

export async function completeTaskAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await dealAccess(dealId))) {
    return;
  }
  const activityId = String(formData.get("activityId") ?? "");
  if (!activityId) {
    return;
  }
  try {
    await getContainer().completeTask(makeId<"ActivityId">(activityId));
  } catch (cause) {
    // The button only exists on a real open task; a rejection is only reachable via a
    // direct POST bypassing the UI (someone else's/nonexistent id) — a no-op for the
    // user, we don't crash with a 500 overlay.
    if (
      cause instanceof ActivityNotFoundError ||
      cause instanceof NotATaskError ||
      (cause instanceof Error &&
        (cause.name === "ActivityNotFoundError" || cause.name === "NotATaskError"))
    ) {
      return;
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
}

/** Saves the proposal as a note in the deal/client timeline (#50). */
export async function saveProposalActivityAction(formData: FormData): Promise<void> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await commercialDealAccess(dealId))) {
    return;
  }
  const clientId = String(formData.get("clientId") ?? "");
  const summary = formText(formData, "summary");
  if (!summary) {
    return;
  }
  await getContainer().recordActivity({
    id: makeId<"ActivityId">(crypto.randomUUID()),
    dealId: makeId<"DealId">(dealId),
    clientId: clientId ? makeId<"ClientId">(clientId) : null,
    kind: "note",
    text: summary,
    author: (await requireUser()).id,
    createdAt: new Date().toISOString(),
    dueDate: null,
  });
  revalidatePath(`/deals/${dealId}`);
}

export type SaveProposalResult = { ok: true } | { ok: false; error: string };

/**
 * Persists the assembled proposal in a structured form (lines + prose + status), upserted
 * by dealId (#462 §4). Unlike `saveProposalActivityAction` (a note in the timeline) — this
 * saves the proposal itself, so it can be shown as a document at "Completed" and prefill
 * the "Purchase order (ERP)". Prices are manual (from the proposal, in USD); AI never
 * invents them.
 */
export async function saveProposalAction(formData: FormData): Promise<SaveProposalResult> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await commercialDealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const clientId = String(formData.get("clientId") ?? "");
  const prose = formText(formData, "prose") ?? "";
  const rawStatus = String(formData.get("status") ?? "draft");
  const status = isProposalStatus(rawStatus) ? rawStatus : "draft";
  const revisionRaw = formNumber(formData, "revision");
  const revision = Number.isFinite(revisionRaw) && revisionRaw >= 1 ? Math.trunc(revisionRaw) : 1;

  const itemsRaw = String(formData.get("items") ?? "[]");
  let parsed: {
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    price: number;
  }[];
  try {
    parsed = JSON.parse(itemsRaw) as typeof parsed;
  } catch {
    return { ok: false, error: "Invalid proposal line format." };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { ok: false, error: "Add at least one line item to the proposal." };
  }

  try {
    await getContainer().saveProposal({
      id: makeId<"SavedProposalId">(crypto.randomUUID()),
      dealId: makeId<"DealId">(dealId),
      clientId: clientId ? makeId<"ClientId">(clientId) : null,
      revision,
      lines: parsed.map((item) => ({
        productId: makeId<"ProductId">(item.productId),
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        unitPriceUsd: item.price,
      })),
      prose,
      status,
      savedAt: new Date().toISOString(),
    });
  } catch (cause) {
    if (
      cause instanceof SavedProposalValidationError ||
      cause instanceof DealNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "SavedProposalValidationError" || cause.name === "DealNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}

/** A single proposal line in flat form (Money → strings). */
export interface ProposalLineView {
  readonly productName: string;
  readonly unit: string;
  readonly quantity: number;
  readonly priceFmt: string | null;
  readonly lineTotalFmt: string | null;
}

/** Flat representation of a proposal for the client component (Money → strings). */
export interface ProposalView {
  readonly clientName: string;
  readonly lines: readonly ProposalLineView[];
  readonly totalFmt: string | null;
  readonly prose: string;
}

export type ProposalResult = { ok: true; view: ProposalView } | { ok: false; error: string };

/**
 * Builds a proposal from manual line items (product · manual price · quantity · unit)
 * and AI-drafted text. Client economics (savings/waste) from the domain are not included
 * in the view (#462 §4.5). Items: [{ productId, productName, unit, quantity, price }].
 */
export async function buildProposalAction(formData: FormData): Promise<ProposalResult> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await commercialDealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }

  const itemsRaw = String(formData.get("items") ?? "[]");
  let parsedItems: {
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    price: number;
  }[];
  try {
    parsedItems = JSON.parse(itemsRaw) as typeof parsedItems;
  } catch {
    return { ok: false, error: "Invalid proposal line format." };
  }
  if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
    return { ok: false, error: "Add at least one line item to the proposal." };
  }
  for (const item of parsedItems) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      return { ok: false, error: "The quantity for each line item must be greater than zero." };
    }
    if (!Number.isFinite(item.price) || item.price < 0) {
      return { ok: false, error: "The price cannot be negative." };
    }
  }

  try {
    // buildProposalDraft is only needed for the client name and the AI-drafted text;
    // the economics are passed as zeros — computeEconomics stays untouched in the domain (#462 §4.5).
    const draft = await getContainer().buildProposalDraft({
      dealId: makeId<"DealId">(dealId),
      items: parsedItems.map((item) => ({
        productId: makeId<"ProductId">(item.productId),
        quantity: item.quantity,
      })),
      monthlyOutput: Money.dollars(0),
      defectBeforePercent: 0,
      defectAfterPercent: 0,
    });

    const lines: ProposalLineView[] = parsedItems.map((item) => {
      const unitPrice = Money.dollars(item.price);
      const lineTotal = unitPrice.multiply(item.quantity);
      return {
        productName: item.productName,
        unit: item.unit,
        quantity: item.quantity,
        priceFmt: unitPrice.format(),
        lineTotalFmt: lineTotal.format(),
      };
    });

    let total: Money | null = null;
    for (const item of parsedItems) {
      const lt = Money.dollars(item.price).multiply(item.quantity);
      total = total === null ? lt : total.add(lt);
    }

    return {
      ok: true,
      view: {
        clientName: draft.client.name,
        lines,
        totalFmt: total ? total.format() : null,
        prose: draft.prose,
      },
    };
  } catch (cause) {
    if (cause instanceof ProposalValidationError) {
      return { ok: false, error: cause.message };
    }
    if (cause instanceof ProductNotFoundError) {
      return { ok: false, error: "Product not found." };
    }
    throw cause;
  }
}

export type RespondToProposalResult = { ok: true } | { ok: false; error: string };

/**
 * Client response to a proposal (#462 §4.3):
 * - "approved" → stage completed + outcome won
 * - "declined" → stage completed + outcome lost
 * - "revise"   → stays in quote, revision N+1 (stage doesn't change, just revalidate)
 */
export async function respondToProposalAction(
  _prev: RespondToProposalResult | null,
  formData: FormData,
): Promise<RespondToProposalResult> {
  const dealId = String(formData.get("dealId") ?? "");
  if (!(await commercialDealAccess(dealId))) {
    return { ok: false, error: NO_ACCESS };
  }
  const resp = String(formData.get("response") ?? "");
  if (resp !== "approved" && resp !== "declined" && resp !== "revise") {
    return { ok: false, error: "Unknown client response." };
  }

  if (resp === "revise") {
    revalidatePath(`/deals/${dealId}`);
    return { ok: true };
  }

  const actor = (await requireUser()).id;
  const outcome: DealOutcome = resp === "approved" ? "won" : "lost";
  const container = getContainer();

  try {
    await container.advanceDealStage({
      dealId: makeId<"DealId">(dealId),
      to: "completed",
      actor,
    });
  } catch (cause) {
    if (
      cause instanceof DealStageTransitionError ||
      (cause instanceof Error && cause.name === "DealStageTransitionError")
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }

  try {
    await container.setDealOutcome({
      dealId: makeId<"DealId">(dealId),
      outcome,
      actor,
    });
  } catch (cause) {
    if (
      cause instanceof DealOutcomeError ||
      (cause instanceof Error && cause.name === "DealOutcomeError")
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }

  // Sync the saved proposal's status with the client's response — so the proposal
  // document at "Completed" reflects "approved/declined by client", not "sent".
  const savedProposal = await container.getProposal(makeId<"DealId">(dealId));
  if (savedProposal) {
    await container.saveProposal({
      ...savedProposal,
      status: outcome === "won" ? "approved" : "declined",
      savedAt: new Date().toISOString(),
    });
  }

  revalidatePath(`/deals/${dealId}`);
  revalidatePath("/deals");
  return { ok: true };
}

export type SaveQualificationResult = { ok: true } | { ok: false; error: string };

/**
 * Saves the data for one qualification substep (upsert by dealId).
 * RBAC: the head of sales or the responsible manager (dealAccess owner boundary).
 */
export async function saveQualificationAction(
  _prev: SaveQualificationResult | null,
  formData: FormData,
): Promise<SaveQualificationResult> {
  const dealId = String(formData.get("dealId") ?? "");
  const viewer = await dealAccess(dealId);
  if (!viewer) {
    return { ok: false, error: NO_ACCESS };
  }
  try {
    await getContainer().saveDealQualification({
      id: makeId<"DealQualificationId">(
        (formData.get("qualificationId") as string | null) ?? crypto.randomUUID(),
      ) as DealQualificationId,
      dealId: makeId<"DealId">(dealId),
      segment: formData.get("segment") as string | null,
      productionScale: formData.get("productionScale") as string | null,
      needTask: formData.get("needTask") as string | null,
      targetProduct: formData.get("targetProduct") as string | null,
      volumeHint: formData.get("volumeHint") as string | null,
      urgency: formData.get("urgency") as string | null,
      decisionMaker: formData.get("decisionMaker") as string | null,
      contactPerson: formData.get("contactPerson") as string | null,
      volumePerMonth: formData.get("volumePerMonth") as string | null,
      revenuePotential: formData.get("revenuePotential") as string | null,
      paymentTerms: formData.get("paymentTerms") as string | null,
      creditLimitHint: formData.get("creditLimitHint") as string | null,
      savedAt: new Date().toISOString(),
    });
  } catch (cause) {
    if (
      cause instanceof DealQualificationValidationError ||
      cause instanceof DealNotFoundError ||
      (cause instanceof Error &&
        (cause.name === "DealQualificationValidationError" || cause.name === "DealNotFoundError"))
    ) {
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  revalidatePath(`/deals/${dealId}`);
  return { ok: true };
}
