"use server";

import { revalidatePath } from "next/cache";
import { DEFAULT_ONBOARDING_DOCS, OnboardingError } from "@/domain/onboarding/onboarding";
import { makeId } from "@/domain/shared/id";
import { canSeeMargin, canSeeTeamAnalytics } from "@/domain/shared/role";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

/** Onboarding is run by commercial roles; approval (legal) is the head of sales. */
async function commercialViewer() {
  const viewer = await resolveViewer();
  return viewer && canSeeMargin(viewer.role) ? viewer : null;
}
async function legalViewer() {
  const viewer = await resolveViewer();
  return viewer && canSeeTeamAnalytics(viewer.role) ? viewer : null;
}

/** Domain-level onboarding rejection (by class OR name — instanceof is unreliable under Turbopack). */
function isOnboardingError(cause: unknown): boolean {
  return (
    cause instanceof OnboardingError || (cause instanceof Error && cause.name === "OnboardingError")
  );
}

export async function startOnboardingAction(formData: FormData): Promise<void> {
  const viewer = await commercialViewer();
  if (!viewer) {
    return;
  }
  const clientName = String(formData.get("clientName") ?? "").trim();
  if (!clientName) {
    return;
  }
  const collectedDocs = DEFAULT_ONBOARDING_DOCS.filter(
    (name) => formData.get(`doc:${name}`) === "on",
  );
  try {
    await getContainer().startOnboarding({
      id: makeId<"OnboardingId">(crypto.randomUUID()),
      clientName,
      ein: String(formData.get("ein") ?? "").trim() || null,
      collectedDocs,
      requestedBy: viewer.id,
      createdAt: new Date().toISOString(),
    });
  } catch (cause) {
    // Domain (validation) — no-op (revalidate refreshes the UI); infra — rethrow, don't hide bugs.
    if (!isOnboardingError(cause)) throw cause;
  }
  revalidatePath("/onboarding");
}

export async function setOnboardingDocAction(formData: FormData): Promise<void> {
  const viewer = await commercialViewer();
  const id = String(formData.get("id") ?? "");
  const docName = String(formData.get("doc") ?? "");
  const collected = formData.get("collected") === "true";
  if (viewer && id && docName) {
    try {
      await getContainer().setOnboardingDoc({ id: makeId<"OnboardingId">(id), docName, collected });
    } catch (cause) {
      // Domain (wrong status / doc not in the package) — no-op (revalidate refreshes); infra — rethrow.
      if (!isOnboardingError(cause)) throw cause;
    }
  }
  revalidatePath("/onboarding");
}

export async function submitOnboardingAction(formData: FormData): Promise<void> {
  const viewer = await commercialViewer();
  const id = String(formData.get("id") ?? "");
  if (viewer && id) {
    try {
      await getContainer().submitOnboarding({ id: makeId<"OnboardingId">(id) });
    } catch (cause) {
      // Domain (not all docs collected / wrong status) — no-op (revalidate refreshes); infra — rethrow.
      if (!isOnboardingError(cause)) throw cause;
    }
  }
  revalidatePath("/onboarding");
}

export async function approveOnboardingAction(formData: FormData): Promise<void> {
  const viewer = await legalViewer();
  const id = String(formData.get("id") ?? "");
  if (viewer && id) {
    try {
      await getContainer().approveOnboarding({ id: makeId<"OnboardingId">(id) });
    } catch (cause) {
      // Domain (not in review) — no-op (revalidate refreshes the UI); infra — rethrow.
      if (!isOnboardingError(cause)) throw cause;
    }
  }
  revalidatePath("/onboarding");
}

export async function rejectOnboardingAction(formData: FormData): Promise<void> {
  const viewer = await legalViewer();
  const id = String(formData.get("id") ?? "");
  if (viewer && id) {
    try {
      await getContainer().rejectOnboarding({
        id: makeId<"OnboardingId">(id),
        note: String(formData.get("note") ?? "").trim(),
      });
    } catch (cause) {
      // Domain (not in review) — no-op (revalidate refreshes the UI); infra — rethrow.
      if (!isOnboardingError(cause)) throw cause;
    }
  }
  revalidatePath("/onboarding");
}
