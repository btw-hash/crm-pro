import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/config/current-user";
import { LoginRolePicker } from "./_components/login-role-picker";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already logged in — redirect to home.
  if (await getCurrentUser()) {
    redirect("/");
  }
  const { error } = await searchParams;
  return <LoginRolePicker error={Boolean(error)} />;
}
