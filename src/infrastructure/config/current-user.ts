import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Viewer } from "@/domain/shared/viewer";
import { getContainer } from "@/infrastructure/composition-root";
import { loadEnv } from "./env";

/** Name of the httpOnly cookie holding the session token. */
export const SESSION_COOKIE = "crmpro_session";

/**
 * Demo user for optional login in dev (id matches the seed). Role `head` -- so
 * localhost without login shows the WHOLE product (every sidebar section is visible).
 * For a specific role -- log in via /login (quick buttons).
 */
const DEMO_VIEWER: Viewer = { id: "head-alexander", role: "head" };

/**
 * TEMPORARY: login is optional in dev -- without a session, act as the demo user, so
 * the team doesn't hit the login wall. In production it's ALWAYS required (the flag is
 * ignored there). Disable in dev: AUTH_OPTIONAL=false.
 */
function isAuthOptional(): boolean {
  return process.env.NODE_ENV !== "production" && loadEnv().AUTH_OPTIONAL !== "false";
}

/** User strictly from the session (cookie -> token). null if not logged in. */
export async function getCurrentUser(): Promise<Viewer | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return getContainer().authenticate(token);
}

/**
 * User for rendering: the session, else the demo user (if login is optional), else
 * null. Used by the layout and pages.
 */
export async function resolveViewer(): Promise<Viewer | null> {
  return (await getCurrentUser()) ?? (isAuthOptional() ? DEMO_VIEWER : null);
}

/** Guard for protected pages/actions: no user -> redirect to /login. */
export async function requireUser(): Promise<Viewer> {
  const user = await resolveViewer();
  if (!user) {
    redirect("/login");
  }
  return user;
}
