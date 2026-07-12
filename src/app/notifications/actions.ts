"use server";

import { revalidatePath } from "next/cache";
import { makeId } from "@/domain/shared/id";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) {
    return;
  }
  // Only your own notification can be marked (the use-case checks recipientId).
  const user = await requireUser();
  await getContainer().markNotificationRead(makeId<"NotificationId">(id), user.id);
  revalidatePath("/notifications");
  revalidatePath("/");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const container = getContainer();
  const user = await requireUser();
  const list = await container.listNotifications(user.id);
  await Promise.all(
    list.filter((n) => !n.read).map((n) => container.markNotificationRead(n.id, user.id)),
  );
  revalidatePath("/notifications");
  revalidatePath("/");
}
