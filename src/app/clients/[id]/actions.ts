"use server";

import { revalidatePath } from "next/cache";
import { makeId } from "@/domain/shared/id";
import { canSeeMargin } from "@/domain/shared/role";
import { isReturnReason, ReturnClaimError } from "@/domain/return-claim/return-claim";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { formNumber } from "@/app/_lib/form-data";

/**
 * Returns — a commercial/operational process: filing/advancing it requires a role with
 * commercial access (head of sales/manager). The owner boundary (manager — their own
 * client) is enforced in the use-case.
 */
async function commercialViewer() {
  const viewer = await resolveViewer();
  return viewer && canSeeMargin(viewer.role) ? viewer : null;
}

/** Domain rejection of a return (by class OR name — instanceof is unreliable under Turbopack). */
function isReturnClaimError(cause: unknown): boolean {
  return (
    cause instanceof ReturnClaimError ||
    (cause instanceof Error && cause.name === "ReturnClaimError")
  );
}

export async function fileReturnAction(formData: FormData): Promise<void> {
  const viewer = await commercialViewer();
  if (!viewer) {
    return;
  }
  const clientId = String(formData.get("clientId") ?? "");
  const productName = String(formData.get("productName") ?? "").trim();
  const reason = String(formData.get("reason") ?? "");
  const quantity = formNumber(formData, "quantity");
  if (!clientId || !productName || !isReturnReason(reason) || !Number.isFinite(quantity)) {
    return;
  }
  const comment = String(formData.get("comment") ?? "").trim();
  try {
    await getContainer().fileReturnClaim({
      viewer,
      id: makeId<"ReturnClaimId">(crypto.randomUUID()),
      clientId: makeId<"ClientId">(clientId),
      productName,
      quantity,
      unit: String(formData.get("unit") ?? "").trim() || undefined,
      reason,
      comment: comment || null,
      createdAt: new Date().toISOString(),
    });
  } catch (cause) {
    // Domain rejection (permissions/validation) — no-op (the form doesn't show someone
    // else's data). We do NOT swallow an unknown (infra) error — rethrow so real bugs
    // aren't hidden.
    if (!isReturnClaimError(cause)) throw cause;
  }
  revalidatePath(`/clients/${clientId}`);
}

export async function advanceReturnAction(formData: FormData): Promise<void> {
  const viewer = await commercialViewer();
  const clientId = String(formData.get("clientId") ?? "");
  const id = String(formData.get("claimId") ?? "");
  if (viewer && id) {
    try {
      await getContainer().advanceReturnClaim({ viewer, id: makeId<"ReturnClaimId">(id) });
    } catch (cause) {
      // Domain (final state/someone else's claim) — no-op (the revalidate below refreshes
      // the UI); infra errors are rethrown.
      if (!isReturnClaimError(cause)) throw cause;
    }
  }
  revalidatePath(`/clients/${clientId}`);
}

export async function rejectReturnAction(formData: FormData): Promise<void> {
  const viewer = await commercialViewer();
  const clientId = String(formData.get("clientId") ?? "");
  const id = String(formData.get("claimId") ?? "");
  if (viewer && id) {
    try {
      await getContainer().rejectReturnClaim({ viewer, id: makeId<"ReturnClaimId">(id) });
    } catch (cause) {
      // Domain (only a pending claim can be rejected) — no-op (revalidate refreshes);
      // infra errors propagate.
      if (!isReturnClaimError(cause)) throw cause;
    }
  }
  revalidatePath(`/clients/${clientId}`);
}
