"use client";

import {
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  Coins,
  FlaskConical,
  Handshake,
  Home,
  LogOut,
  type LucideIcon,
  Menu,
  Package,
  Plus,
  Receipt,
  Scale,
  Sparkles,
  TrendingUp,
  Truck,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import type { Role } from "@/domain/shared/role";

interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly Icon: LucideIcon;
  readonly match: (p: string) => boolean;
  readonly roles: readonly Role[];
}

const ALL: readonly Role[] = ["head", "mop", "technologist", "procurement", "accountant", "logist"];

const NAV_HOME: NavItem = {
  href: "/",
  label: "Home",
  Icon: Home,
  match: (p) => p === "/",
  roles: ALL,
};
// Tech queue — for the technologist this is the PRIMARY work section, so in the design
// it lives in the "Main" group and on the collapsed rail (idx11), not in "Operations".
// For the head, the same section lives in "Operations" (see OPS below, roles:["head"]).
const NAV_TECH_QUEUE: NavItem = {
  href: "/tech-queue",
  label: "Tech queue",
  Icon: FlaskConical,
  match: (p) => p.startsWith("/tech-queue"),
  roles: ["technologist"],
};
const NAV_MY_SHIPMENTS: NavItem = {
  href: "/my-shipments",
  label: "My shipments",
  Icon: Truck,
  match: (p) => p.startsWith("/my-shipments"),
  // "Main" + rail (design idx17): shipments are the Manager's most-clicked section.
  roles: ["mop", "head"],
};
const NAV_DEALS: NavItem = {
  href: "/deals",
  label: "Deals",
  Icon: Briefcase,
  match: (p) => p.startsWith("/deals"),
  roles: ["head", "mop"],
};
const NAV_CLIENTS: NavItem = {
  href: "/clients",
  label: "Clients",
  Icon: Users,
  match: (p) => p.startsWith("/clients"),
  // The commercial client base — only for roles with access (canSeeClientBase):
  // head, manager, category manager. Accountant/logistics/technologist have their own scope.
  roles: ["head", "mop", "procurement"],
};
const NAV_ANALYTICS: NavItem = {
  href: "/analytics",
  label: "Analytics",
  Icon: BarChart3,
  match: (p) => p.startsWith("/analytics"),
  roles: ["head", "mop"],
};
// Technologist's test calendar — "Main" + rail (design idx19).
const NAV_CALENDAR: NavItem = {
  href: "/calendar",
  label: "Calendar",
  Icon: Calendar,
  match: (p) => p.startsWith("/calendar"),
  roles: ["technologist"],
};
const NAV_CATALOG: NavItem = {
  href: "/products",
  label: "Products",
  Icon: Package,
  match: (p) => p.startsWith("/products"),
  roles: ALL,
};
const NAV_ASSISTANT: NavItem = {
  href: "/assistant",
  label: "Assistant",
  Icon: Sparkles,
  match: (p) => p.startsWith("/assistant"),
  roles: ["head", "mop"],
};
const NAV_USAGE: NavItem = {
  href: "/usage",
  label: "AI spend",
  Icon: Coins,
  match: (p) => p.startsWith("/usage"),
  roles: ["head"],
};

// Rail (collapsed) — fixed order as in the reference design (RAIL_ORDER = 0,11,17,2,1,19,3,4,5,18).
const RAIL: readonly NavItem[] = [
  NAV_HOME,
  NAV_TECH_QUEUE,
  NAV_MY_SHIPMENTS,
  NAV_DEALS,
  NAV_CLIENTS,
  NAV_CALENDAR,
  NAV_CATALOG,
  NAV_ANALYTICS,
  NAV_ASSISTANT,
  NAV_USAGE,
];
// Groups of the expanded panel (design grp 'main' / 'tools').
const MAIN: readonly NavItem[] = [
  NAV_HOME,
  NAV_TECH_QUEUE,
  NAV_MY_SHIPMENTS,
  NAV_DEALS,
  NAV_CLIENTS,
  NAV_ANALYTICS,
  NAV_CALENDAR,
];
const TOOLS: readonly NavItem[] = [NAV_CATALOG, NAV_ASSISTANT, NAV_USAGE];
const OPS: readonly NavItem[] = [
  {
    href: "/notifications",
    label: "Notifications",
    Icon: Bell,
    match: (p) => p.startsWith("/notifications"),
    roles: ALL,
  },
  {
    href: "/procurement",
    label: "Procurement",
    Icon: Truck,
    match: (p) => p.startsWith("/procurement"),
    roles: ["procurement", "head"],
  },
  {
    href: "/assortment",
    label: "Assortment",
    Icon: TrendingUp,
    match: (p) => p.startsWith("/assortment"),
    roles: ["procurement", "head"],
  },
  {
    href: "/shipments",
    label: "Shipments",
    Icon: Truck,
    match: (p) => p.startsWith("/shipments") && !p.startsWith("/shipments/additional"),
    roles: ["procurement", "head"],
  },
  {
    href: "/accounting",
    label: "Accounting",
    Icon: Receipt,
    match: (p) => p.startsWith("/accounting"),
    roles: ["accountant", "head"],
  },
  {
    // Head of sales sees the tech queue in "Operations"; the technologist themselves — in "Main" (NAV_TECH_QUEUE).
    href: "/tech-queue",
    label: "Tech queue",
    Icon: FlaskConical,
    match: (p) => p.startsWith("/tech-queue"),
    roles: ["head"],
  },
  {
    href: "/logist",
    label: "Loading & delivery",
    Icon: Truck,
    match: (p) => p.startsWith("/logist"),
    roles: ["logist", "head"],
  },
  {
    href: "/packing",
    label: "Packing",
    Icon: Scale,
    match: (p) => p.startsWith("/packing"),
    roles: ["procurement", "head"],
  },
  {
    href: "/defects",
    label: "Defect warehouse",
    Icon: Wrench,
    match: (p) => p.startsWith("/defects"),
    roles: ["procurement", "head"],
  },
  {
    // Add-on requests outside business hours (canFileAdditionalOrder) — an extension beyond
    // the design, leads to the real /shipments/additional screen for the manager.
    href: "/shipments/additional",
    label: "Add-on requests",
    Icon: Plus,
    match: (p) => p.startsWith("/shipments/additional"),
    roles: ["mop", "head"],
  },
  {
    href: "/onboarding",
    label: "Onboarding",
    Icon: Handshake,
    match: (p) => p.startsWith("/onboarding"),
    roles: ["head", "mop", "procurement"],
  },
];

const ROW_H = 60;
// Sidebar width transition duration (ms) — synced with the CSS .42s below.
const WIDTH_TRANSITION_MS = 420;

/** Initials for the logout-row avatar (reference `userInit`) — a deterministic
    presentational derivative of userName: the first letters of the first two
    words, uppercased. Requires no new data/fields. */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

function LogoutButton({ children }: { children: React.ReactNode }) {
  return (
    <form action={logoutAction} style={{ margin: 0 }}>
      <button
        type="submit"
        title="Log out / switch role"
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
        }}
      >
        {children}
      </button>
    </form>
  );
}

export function AppSidebar({
  role,
  userName,
  userRoleLabel,
  createRequestSlot,
  createRequestRailSlot,
}: {
  role: Role;
  userName: string;
  userRoleLabel: string;
  /** "New request" button (rendered in the server layout, so the client sidebar
      doesn't pull in the modal's server-only chain). Shown only in the expanded panel. */
  createRequestSlot?: React.ReactNode;
  /** The same button as a "+" square for the collapsed rail (reference design). */
  createRequestRailSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  // true while the width animation is running. During that time we keep the inner
  // box overflow:hidden, so the "scoop" cutout / active-item disc get clipped by
  // the shrinking box's right edge and don't hang as a "white drop" on the dark
  // background while the width and indicator geometry are out of sync.
  const [animating, setAnimating] = useState(false);
  const animTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toggleCollapsed = useCallback((next: boolean) => {
    setCollapsed(next);
    setAnimating(true);
    if (animTimer.current) clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => setAnimating(false), WIDTH_TRANSITION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (animTimer.current) clearTimeout(animTimer.current);
    };
  }, []);

  const opsItems = OPS.filter((i) => i.roles.includes(role));
  const rail = RAIL.filter((i) => i.roles.includes(role));
  // An active OPS section that isn't on the rail is shown as a "dynamic" row at the
  // bottom — so the disc indicator reflects the current section for operational
  // roles too (reference `isDynRail`).
  const dynamicRailItem = rail.some((i) => i.match(pathname))
    ? null
    : (opsItems.find((i) => i.match(pathname)) ?? null);
  const railRender = dynamicRailItem ? [...rail, dynamicRailItem] : rail;
  const activeIdx = railRender.findIndex((i) => i.match(pathname));
  const discOn = activeIdx >= 0;
  // Offsets for the three indicator layers (as in the reference design): row center = a*60+30.
  const shift = (half: number) => (discOn ? activeIdx * ROW_H + ROW_H / 2 - half : 0);

  const mainItems = MAIN.filter((i) => i.roles.includes(role));
  const toolItems = TOOLS.filter((i) => i.roles.includes(role));

  const railContainerH = railRender.length * ROW_H;
  const showExpanded = !collapsed || mobileOpen;

  return (
    <>
      <button className="mobile-burger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <Menu size={22} strokeWidth={2} aria-hidden />
      </button>
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} aria-hidden />
      )}
      <div
        className={"app-sidebar" + (mobileOpen ? " is-open" : "")}
        style={{
          flexShrink: 0,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
          height: "100vh",
          padding: "18px 0 18px 18px",
          width: showExpanded ? 266 : 150,
          transition: "width .42s cubic-bezier(.4,0,.2,1)",
          // Collapsed rail: the outer shell is transparent (the slim inner-box "capsule",
          // 78px, is visible), the active-item disc pokes out past the right edge. The
          // expanded panel and the mobile off-canvas keep the dark background/clip from
          // the .app-sidebar class.
          ...(showExpanded ? {} : { background: "transparent", overflow: "visible" }),
        }}
      >
        <div
          style={{
            background: "#1c1f27",
            borderRadius: 30,
            height: "calc(100vh - 36px)",
            display: "flex",
            flexDirection: "column",
            // During the width animation — always hidden: the active-item cutout/disc
            // are clipped by the box edge and fade in smoothly as it narrows, without a
            // "white drop". We only enable visible once the collapsed box has settled.
            overflow: !showExpanded && !animating ? "visible" : "hidden",
            width: showExpanded ? 248 : 78,
            transition: "width .42s cubic-bezier(.4,0,.2,1)",
          }}
        >
          {!showExpanded ? (
            // ─── RAIL (collapsed) ─────────────────────────────────────────────

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "22px 0 20px",
                height: "100%",
                width: 78,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  background: "#BF322B",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  font: "800 17px Arial",
                  marginBottom: 8,
                }}
              >
                C
              </div>
              <div
                onClick={() => toggleCollapsed(false)}
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 13,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cfd3db",
                  cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                <Menu size={20} strokeWidth={2} aria-hidden />
              </div>

              {createRequestRailSlot}

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: railContainerH,
                  marginTop: 6,
                }}
              >
                {/* "scoop" — a background-colored cream cutout on the rail's right edge,
                    out of which the active item's dark disc emerges. Travels vertically
                    together with the disc between menu items (reference design). */}
                <svg
                  width="46"
                  height="140"
                  viewBox="0 0 46 140"
                  style={{
                    position: "absolute",
                    right: 0,
                    top: 0,
                    transform: `translateY(${shift(70)}px)`,
                    transition: "transform .45s cubic-bezier(.5,.05,.2,1), opacity .2s ease",
                    opacity: discOn && !animating ? 1 : 0,
                    zIndex: 1,
                    pointerEvents: "none",
                  }}
                  aria-hidden
                >
                  <path
                    d="M46,0 C46,34 6,36 6,70 C6,104 46,106 46,140 Z"
                    style={{ fill: "#F8F3EF" }}
                  />
                </svg>
                {/* floating disc */}
                <div
                  style={{
                    position: "absolute",
                    right: -28,
                    top: 0,
                    transform: `translateY(${shift(28)}px)`,
                    transition: "transform .45s cubic-bezier(.5,.05,.2,1), opacity .2s ease",
                    opacity: discOn && !animating ? 1 : 0,
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: "#2b303c",
                    boxShadow: "0 10px 22px rgba(0,0,0,.30)",
                    zIndex: 3,
                    pointerEvents: "none",
                  }}
                  aria-hidden
                />
                {/* glyph stack: section icons with cross-fade */}
                <div
                  style={{
                    position: "absolute",
                    right: -12,
                    top: 0,
                    width: 24,
                    height: 24,
                    transform: `translateY(${shift(12)}px)`,
                    transition: "transform .45s cubic-bezier(.5,.05,.2,1), opacity .2s ease",
                    opacity: discOn && !animating ? 1 : 0,
                    color: "#fff",
                    zIndex: 4,
                    pointerEvents: "none",
                  }}
                  aria-hidden
                >
                  {railRender.map((item, i) => {
                    const Icon = item.Icon;
                    return (
                      <div
                        key={item.href}
                        style={{
                          position: "absolute",
                          inset: 0,
                          opacity: i === activeIdx ? 1 : 0,
                          transition: "opacity .25s",
                        }}
                      >
                        <Icon size={24} strokeWidth={2} aria-hidden />
                      </div>
                    );
                  })}
                </div>

                {railRender.map((item, i) => {
                  const active = i === activeIdx;
                  const Icon = item.Icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="railrow"
                      title={item.label}
                      style={{
                        position: "relative",
                        zIndex: 2,
                        height: ROW_H,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: active ? "transparent" : "#8b90a0",
                        transition: "color .3s",
                      }}
                    >
                      <Icon size={22} strokeWidth={2} aria-hidden />
                    </Link>
                  );
                })}
              </div>

              <div
                style={{
                  marginTop: "auto",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 14,
                  color: "#cfd3db",
                }}
              >
                <LogoutButton>
                  <span
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 13,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <LogOut size={20} strokeWidth={2} aria-hidden />
                  </span>
                </LogoutButton>
              </div>
            </div>
          ) : (
            // ─── PANEL (expanded) ─────────────────────────────────────────────
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "20px 18px 16px",
                height: "100%",
                width: 248,
                animation: "panelIn .26s cubic-bezier(.4,0,.2,1) .34s both",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 26,
                  padding: "0 6px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: "#BF322B",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      font: "800 16px Arial",
                    }}
                  >
                    C
                  </div>
                  <span style={{ font: "700 19px Arial", color: "#fff", letterSpacing: "-.3px" }}>
                    CRM Pro
                  </span>
                </div>
                <div
                  onClick={() => toggleCollapsed(true)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#cfd3db",
                    cursor: "pointer",
                  }}
                >
                  <Menu size={18} strokeWidth={2} aria-hidden />
                </div>
              </div>

              {/* Global "New request" (#0055) — the historical place for the create
                button in the menu; only in the expanded panel and only for roles
                with permission to create. */}
              {createRequestSlot}

              <div
                className="sidebar-scroll"
                style={{ flex: 1, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}
              >
                <NavGroup
                  title="MAIN"
                  items={mainItems}
                  pathname={pathname}
                  first
                  onLinkClick={() => setMobileOpen(false)}
                />
                {toolItems.length > 0 ? (
                  <NavGroup
                    title="TOOLS"
                    items={toolItems}
                    pathname={pathname}
                    onLinkClick={() => setMobileOpen(false)}
                  />
                ) : null}
                {opsItems.length > 0 ? (
                  <NavGroup
                    title="OPERATIONS"
                    items={opsItems}
                    pathname={pathname}
                    rowGap={2}
                    onLinkClick={() => setMobileOpen(false)}
                  />
                ) : null}
              </div>

              <div style={{ marginTop: 14, color: "#fff" }}>
                <LogoutButton>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 11,
                      background: "#2b303c",
                      borderRadius: 16,
                      padding: "11px 12px",
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg,#8a90a0,#5b6070)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#fff",
                        font: "700 12px Arial",
                        flex: "none",
                      }}
                    >
                      {initialsOf(userName)}
                    </span>
                    <span style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          font: "600 13px/1.1 Arial",
                          color: "#fff",
                        }}
                      >
                        {userName}
                      </span>
                      <span style={{ display: "block", font: "400 11px Arial", color: "#8b90a0" }}>
                        {userRoleLabel}
                      </span>
                    </span>
                    <LogOut size={16} strokeWidth={2} color="#8b90a0" aria-hidden />
                  </span>
                </LogoutButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function NavGroup({
  title,
  items,
  pathname,
  first = false,
  rowGap = 5,
  onLinkClick,
}: {
  title: string;
  items: readonly NavItem[];
  pathname: string;
  first?: boolean;
  /** Gap between items (reference design: MAIN/TOOLS = 5px, OPERATIONS = 2px). */
  rowGap?: number;
  onLinkClick?: () => void;
}) {
  return (
    <>
      <div
        style={{
          font: "600 11px Arial",
          color: "#5b6070",
          letterSpacing: 1.5,
          margin: first ? "0 8px 6px" : "10px 8px 6px",
        }}
      >
        {title}
      </div>
      {items.map((item) => {
        const active = item.match(pathname);
        const Icon = item.Icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="navrow"
            onClick={onLinkClick}
            style={{
              background: active ? "#2b303c" : "transparent",
              color: active ? "#fff" : "#9aa0ad",
              borderRadius: 12,
              padding: "9px 14px",
              display: "flex",
              alignItems: "center",
              gap: 11,
              font: `${active ? 600 : 500} 14px Arial`,
              textDecoration: "none",
              marginBottom: rowGap,
            }}
          >
            <Icon size={18} strokeWidth={2} aria-hidden style={{ flex: "none" }} />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
