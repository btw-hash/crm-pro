import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/domain/shared/role";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";
import { MANAGER_LABELS, managerLabel, personLabel } from "@/infrastructure/persistence/seed";
import { AppSidebar } from "./_components/app-sidebar";
import { AppTopbar } from "./_components/app-topbar";
import { CreateRequestButton } from "./_components/create-request-button";
import { NotificationBell } from "./_components/notification-bell";
import { ScreenTransition } from "./_components/screen-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Pro",
  description: "System for the sales team",
};

const SHELL_BG =
  "radial-gradient(820px 560px at 96% -6%, rgba(191,50,43,0.16), transparent 60%), " +
  "radial-gradient(620px 560px at 40% 16%, rgba(227,179,43,0.18), transparent 62%), " +
  "radial-gradient(760px 620px at 76% 110%, rgba(150,120,90,0.10), transparent 60%)";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await resolveViewer();
  // Data for the global "New request" button in the sidebar (#0055) — only for
  // roles allowed to create requests (head of sales / manager). Owner dropdown:
  // head sees all managers, a manager sees only themselves (like on /deals;
  // server-side validation happens in the actions).
  let createRequestSlot: ReactNode = null;
  let createRequestRailSlot: ReactNode = null;
  if (user && (user.role === "mop" || user.role === "head")) {
    const container = getContainer();
    const [clients, products] = await Promise.all([
      container.listClients(user),
      container.listProducts(),
    ]);
    const managers =
      user.role === "head"
        ? Object.entries(MANAGER_LABELS).map(([id, name]) => ({ id, name }))
        : [{ id: user.id, name: managerLabel(user.id) }];
    const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));
    const productOptions = products.map((p) => ({ id: p.id, name: p.name }));
    createRequestSlot = (
      <CreateRequestButton
        variant="sidebar"
        clients={clientOptions}
        products={productOptions}
        managers={managers}
        currentUserId={user.id}
      />
    );
    createRequestRailSlot = (
      <CreateRequestButton
        variant="rail"
        clients={clientOptions}
        products={productOptions}
        managers={managers}
        currentUserId={user.id}
      />
    );
  }
  return (
    <html lang="en">
      <body>
        {user ? (
          <div
            style={{
              display: "flex",
              minHeight: "100vh",
              background: `${SHELL_BG}, #F8F3EF`,
              fontFamily: "Arial, sans-serif",
              color: "#16181d",
            }}
          >
            <AppSidebar
              role={user.role}
              userName={personLabel(user.id)}
              userRoleLabel={ROLE_LABELS[user.role]}
              createRequestSlot={createRequestSlot}
              createRequestRailSlot={createRequestRailSlot}
            />
            <div
              className="app-content"
              style={{ flex: 1, minWidth: 0, maxWidth: 1700, padding: "22px 26px 22px 22px" }}
            >
              <AppTopbar
                userName={personLabel(user.id)}
                userSecondary={ROLE_LABELS[user.role]}
                bell={<NotificationBell userId={user.id} />}
              />
              <main>
                <ScreenTransition>{children}</ScreenTransition>
              </main>
            </div>
          </div>
        ) : (
          <main className="app-auth">{children}</main>
        )}
      </body>
    </html>
  );
}
