import { getContainer } from "@/infrastructure/composition-root";
import { NotificationBellMenu, type BellItem } from "./notification-bell-menu";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The bell in the topbar: unread count + a dropdown preview of the latest
 * notification text (not just a counter). Unread first, then recent; top 6.
 */
export async function NotificationBell({ userId }: { userId: string }) {
  const all = await getContainer().listNotifications(userId);
  const count = all.filter((n) => !n.read).length;
  const items: readonly BellItem[] = [...all]
    .sort((a, b) => (a.read === b.read ? b.createdAt.localeCompare(a.createdAt) : a.read ? 1 : -1))
    .slice(0, 6)
    .map((n) => ({
      id: n.id,
      message: n.message,
      time: formatDateTime(n.createdAt),
      dealId: n.dealId,
      read: n.read,
      important: n.important,
    }));
  return <NotificationBellMenu count={count} items={items} />;
}
