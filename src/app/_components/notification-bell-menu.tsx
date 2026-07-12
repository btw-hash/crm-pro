"use client";

import { ArrowRight, Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { markAllNotificationsReadAction } from "@/app/notifications/actions";

export interface BellItem {
  readonly id: string;
  readonly message: string;
  readonly time: string;
  readonly dealId: string | null;
  readonly read: boolean;
  readonly important: boolean;
}

/**
 * "Important" chip — the only chip in the bell per the reference design (CRM-PRO.dc.html:764).
 * Newness is shown not as a chip but as a colored dot indicator to the left of the title.
 */
const CHIP_IMPORTANT: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  background: "#f7e4e2",
  color: "#bf322b",
  font: "700 9px Arial",
  letterSpacing: ".3px",
  padding: "1px 7px",
  borderRadius: "999px",
  whiteSpace: "nowrap",
};

/** Round glass topbar button 42×42 (a single style shared by search/avatar/bell). */
const GLASS_BELL: React.CSSProperties = {
  position: "relative",
  width: 42,
  height: 42,
  borderRadius: "50%",
  background: "rgba(255,255,255,0.45)",
  backdropFilter: "blur(16px) saturate(1.5)",
  WebkitBackdropFilter: "blur(16px) saturate(1.5)",
  border: "1px solid rgba(255,255,255,0.65)",
  boxShadow: "0 6px 18px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#16181d",
  cursor: "pointer",
  padding: 0,
};

/** Ochre unread-count badge (CRM-PRO.dc.html:757). */
const BELL_BADGE: React.CSSProperties = {
  position: "absolute",
  top: -2,
  right: -2,
  minWidth: 17,
  height: 17,
  padding: "0 4px",
  borderRadius: "999px",
  background: "#e3b32b",
  color: "#5a4200",
  font: "700 10px Arial",
  lineHeight: "17px",
  textAlign: "center",
};

/**
 * A bell with a dropdown preview of the latest notifications (text, not just a
 * count). Full management — on /notifications. Closes on an outside click or navigation.
 */
export function NotificationBellMenu({
  count,
  items,
}: {
  count: number;
  items: readonly BellItem[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        style={GLASS_BELL}
        aria-label={count > 0 ? `Notifications, unread: ${count}` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <Bell size={18} strokeWidth={2} aria-hidden />
        {count > 0 ? <span style={BELL_BADGE}>{count}</span> : null}
      </button>

      {open ? (
        <>
          <div
            onClick={() => setOpen(false)}
            aria-hidden
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
          />
          <div
            role="menu"
            style={{
              position: "absolute",
              top: 54,
              right: 0,
              zIndex: 50,
              width: 346,
              background: "rgba(255,255,255,0.82)",
              backdropFilter: "blur(28px) saturate(1.4)",
              WebkitBackdropFilter: "blur(28px) saturate(1.4)",
              border: "1px solid rgba(255,255,255,0.8)",
              boxShadow: "0 20px 54px rgba(31,45,80,0.20), inset 0 1px 0 rgba(255,255,255,0.9)",
              borderRadius: 18,
              padding: 8,
              textAlign: "left",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px 10px",
              }}
            >
              <span style={{ font: "600 15px Arial", color: "#16181d" }}>Notifications</span>
              {count > 0 ? (
                <form action={markAllNotificationsReadAction}>
                  <button
                    type="submit"
                    style={{
                      border: "none",
                      background: "#fbf1d6",
                      color: "#9a6a00",
                      font: "700 11px Arial",
                      padding: "3px 9px",
                      borderRadius: "999px",
                      cursor: "pointer",
                    }}
                  >
                    {count} new
                  </button>
                </form>
              ) : null}
            </div>

            {items.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.dealId ? `/deals/${n.dealId}` : "/notifications"}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-start",
                      padding: "9px 10px",
                      borderRadius: 12,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        // Newness = dot indicator (not a chip): ochre for unread,
                        // gray for read (CRM-PRO.dc.html:764).
                        background: n.read ? "#c9ccd2" : "#e3b32b",
                        marginTop: 5,
                        flex: "none",
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            font: `${n.read ? 500 : 600} 13px Arial`,
                            color: n.read ? "#6b6f78" : "#16181d",
                          }}
                        >
                          {n.message}
                        </span>
                        {n.important ? <span style={CHIP_IMPORTANT}>important</span> : null}
                      </div>
                      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>
                        {n.time}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: "34px 8px",
                  textAlign: "center",
                  font: "400 13px Arial",
                  color: "#9a9ea8",
                }}
              >
                No notifications yet.
              </div>
            )}

            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              style={{
                marginTop: 6,
                padding: 11,
                borderRadius: 13,
                background: "#1c1f27",
                color: "#fff",
                font: "600 13px Arial",
                textAlign: "center",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              View all
              <ArrowRight size={14} strokeWidth={2.4} aria-hidden />
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
