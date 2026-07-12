import Link from "next/link";
import { OpsFilters } from "@/app/_components/ops-filters";
import {
  matchesNotificationFilter,
  NOTIFICATION_FILTER_LABELS,
  NOTIFICATION_FILTERS,
  parseNotificationFilter,
} from "@/domain/notification/notification-filter";
import { requireUser } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { personLabel } from "@/infrastructure/persistence/seed";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- CRM Pro UI warm theme: shared inline styles for the operations section ---
const GLASS_PANEL: React.CSSProperties = {
  background: "rgba(255,255,255,0.6)",
  backdropFilter: "blur(22px) saturate(1.3)",
  WebkitBackdropFilter: "blur(22px) saturate(1.3)",
  border: "1px solid rgba(255,255,255,0.7)",
  boxShadow: "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
  borderRadius: "22px",
  padding: "8px 22px 14px",
};

const COL_HEAD: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  padding: "14px 6px 12px",
  borderBottom: "1px solid #eef0f2",
};

const COL_LABEL: React.CSSProperties = {
  flex: 1,
  font: "600 11px Arial",
  color: "#9a9ea8",
  letterSpacing: ".5px",
};

const ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 6px",
  borderBottom: "1px solid #f3f4f6",
};

const CELL: React.CSSProperties = { flex: 1, font: "500 13px Arial" };

const STATUS_TONE = {
  ok: { background: "#e7f5ee", color: "#197a48" },
  warn: { background: "#fbf1d6", color: "#9a6a00" },
  bad: { background: "#f7e4e2", color: "var(--accent)" },
  neu: { background: "#efe9e2", color: "#6a5f54" },
} as const;

function statusBadgeStyle(tone: keyof typeof STATUS_TONE): React.CSSProperties {
  return {
    ...STATUS_TONE[tone],
    font: "600 11px Arial",
    padding: "4px 10px",
    borderRadius: "999px",
  };
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await requireUser();
  const notifications = await getContainer().listNotifications(user.id);
  const unread = notifications.filter((n) => !n.read).length;
  const total = notifications.length;
  const withDeal = notifications.filter((n) => n.dealId).length;

  // Working filter chips (?filter=, like the ops screens). Used to be dead <button>s.
  const activeFilter = parseNotificationFilter((await searchParams).filter);
  const visibleNotifications = notifications.filter((n) =>
    matchesNotificationFilter(activeFilter, n),
  );

  return (
    <div className="scr">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "18px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <div style={{ font: "700 28px Arial", letterSpacing: "-.5px", color: "#16181d" }}>
            Notifications
          </div>
          <div style={{ font: "400 13px Arial", color: "#9a9ea8", marginTop: "4px" }}>
            Operations section › recipient {personLabel(user.id)}
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {unread > 0 ? (
            <form action={markAllNotificationsReadAction}>
              <button
                type="submit"
                style={{
                  border: "none",
                  background: "#1c1f27",
                  color: "#fff",
                  font: "600 13px Arial",
                  padding: "11px 16px",
                  borderRadius: "24px",
                  cursor: "pointer",
                }}
              >
                Mark all as read
              </button>
            </form>
          ) : (
            <button
              type="button"
              disabled
              style={{
                border: "none",
                background: "#1c1f27",
                color: "#fff",
                font: "600 13px Arial",
                padding: "11px 16px",
                borderRadius: "24px",
                cursor: "default",
                opacity: 0.45,
              }}
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <OpsFilters
        chips={NOTIFICATION_FILTERS.map((value) => ({
          label: NOTIFICATION_FILTER_LABELS[value],
          value,
        }))}
        metrics={[
          { value: unread, label: "new", color: "#9a6a00", bordered: false },
          { value: total - unread, label: "read", color: "#197a48", bordered: true },
          { value: withDeal, label: "deal-related", color: "#9a6a00", bordered: true },
        ]}
      />

      {notifications.length === 0 ? (
        <div style={{ ...GLASS_PANEL, padding: "40px 22px", textAlign: "center" }}>
          <p style={{ font: "400 14px Arial", color: "#9a9ea8", margin: 0 }}>
            No notifications yet.
          </p>
        </div>
      ) : visibleNotifications.length > 0 ? (
        <div style={GLASS_PANEL}>
          <div style={COL_HEAD}>
            <span style={{ ...COL_LABEL, flex: "none", width: "96px" }}>Status</span>
            <span style={{ ...COL_LABEL, flex: 3 }}>Message</span>
            <span style={{ ...COL_LABEL, flex: "none", width: "130px" }}>When</span>
            <span style={{ ...COL_LABEL, flex: "none", width: "150px", textAlign: "right" }}>
              Action
            </span>
          </div>
          {visibleNotifications.map((n) => (
            <div
              key={n.id}
              style={{
                ...ROW,
                // New — ochre background (design §5.1); read — muted.
                background: n.read ? undefined : "#fdf7e8",
                opacity: n.read ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  ...CELL,
                  flex: "none",
                  width: "96px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: "4px",
                }}
              >
                <span style={statusBadgeStyle(n.read ? "neu" : "warn")}>
                  {n.read ? "read" : "new"}
                </span>
                {n.important ? <span style={statusBadgeStyle("bad")}>important</span> : null}
              </span>
              <span style={{ ...CELL, flex: 3, fontWeight: n.read ? 500 : 700 }}>
                {n.message}
                {n.dealId ? (
                  <>
                    {" · "}
                    <Link
                      href={`/deals/${n.dealId}`}
                      style={{ color: "var(--accent)", font: "600 13px Arial" }}
                    >
                      open deal
                    </Link>
                  </>
                ) : null}
              </span>
              <span
                style={{
                  ...CELL,
                  flex: "none",
                  width: "130px",
                  font: "400 12px Arial",
                  color: "#9a9ea8",
                }}
              >
                {formatDateTime(n.createdAt)}
              </span>
              <span
                style={{
                  ...CELL,
                  flex: "none",
                  width: "150px",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                {!n.read ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      style={{
                        border: "1px solid rgba(255,255,255,0.6)",
                        background: "rgba(255,255,255,0.55)",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        color: "#16181d",
                        font: "600 12px Arial",
                        padding: "7px 14px",
                        borderRadius: "999px",
                        cursor: "pointer",
                      }}
                    >
                      Mark read
                    </button>
                  </form>
                ) : (
                  <span style={{ font: "400 12px Arial", color: "#c2c6cf" }}>—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ ...GLASS_PANEL, padding: "40px 22px", textAlign: "center" }}>
          <p style={{ font: "400 14px Arial", color: "#9a9ea8", margin: 0 }}>
            No notifications in the "{NOTIFICATION_FILTER_LABELS[activeFilter]}" filter.
          </p>
        </div>
      )}
    </div>
  );
}
