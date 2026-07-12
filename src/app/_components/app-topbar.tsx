"use client";

import { Search } from "lucide-react";
import type { ReactNode } from "react";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const s = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
  return s.toUpperCase() || "?";
}

/** Round glass topbar button 42×42 (search/avatar/bell — a single reference-design style). */
const GLASS_CONTROL: React.CSSProperties = {
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

/**
 * Glass topbar matching the reference design: round search (opens the Ctrl+K
 * command palette), a slot for the bell (server-side NotificationBell with a
 * real counter), avatar chip.
 */
export function AppTopbar({
  userName,
  userSecondary,
  bell,
}: {
  userName: string;
  userSecondary: string;
  bell: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
      <div style={{ flex: 1 }} />
      <button
        type="button"
        style={GLASS_CONTROL}
        title="Search · Ctrl K"
        aria-label="Search (Ctrl K)"
        onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
      >
        <Search size={18} strokeWidth={2} aria-hidden />
      </button>
      {bell}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "rgba(255,255,255,0.45)",
          backdropFilter: "blur(16px) saturate(1.5)",
          WebkitBackdropFilter: "blur(16px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,0.65)",
          boxShadow: "0 6px 18px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
          padding: "6px 14px 6px 6px",
          borderRadius: 30,
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#8a90a0,#2b303c)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            font: "700 12px Arial",
          }}
        >
          {initials(userName)}
        </div>
        <div>
          <div style={{ font: "600 13px/1.1 Arial" }}>{userName}</div>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8" }}>{userSecondary}</div>
        </div>
      </div>
    </div>
  );
}
