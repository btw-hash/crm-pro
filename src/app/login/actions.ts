"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { InvalidCredentialsError } from "@/application/use-cases/login";
import { getContainer } from "@/infrastructure/composition-root";
import { SESSION_COOKIE } from "@/infrastructure/config/current-user";

const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function loginAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");

  try {
    const { token } = await getContainer().login({ username, password });
    (await cookies()).set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
  } catch (error) {
    // Match by name, not only instanceof: under Turbopack the "use server" bundle
    // and the SSR bundle can hold different copies of the error class → instanceof
    // would return false, and the "invalid password" error would surface as an
    // overlay instead of a soft redirect.
    if (
      error instanceof InvalidCredentialsError ||
      (error instanceof Error && error.name === "InvalidCredentialsError")
    ) {
      redirect("/login?error=1");
    }
    throw error;
  }
  // Success: redirect outside the try, so NEXT_REDIRECT doesn't land in catch.
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  await getContainer().logout(jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
