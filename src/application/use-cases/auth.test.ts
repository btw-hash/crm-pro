import { describe, expect, it } from "vitest";
import { ScryptPasswordHasher } from "@/infrastructure/auth/scrypt-password-hasher";
import { InMemorySessionRepository } from "@/infrastructure/persistence/in-memory-session-repository";
import { InMemoryUserRepository } from "@/infrastructure/persistence/in-memory-user-repository";
import { makeAuthenticate } from "./authenticate";
import { InvalidCredentialsError, makeLogin } from "./login";
import { makeLogout } from "./logout";

function build() {
  const hasher = new ScryptPasswordHasher();
  const users = new InMemoryUserRepository(
    [
      {
        id: "manager-owens",
        username: "owens",
        name: "Daniel Owens",
        role: "mop",
        password: "demo1234",
      },
    ],
    hasher,
  );
  const sessions = new InMemorySessionRepository();
  return {
    login: makeLogin({ users, sessions, hasher }),
    authenticate: makeAuthenticate({ users, sessions }),
    logout: makeLogout({ sessions }),
  };
}

describe("auth", () => {
  it("logs in with valid credentials and resolves Viewer by token", async () => {
    const { login, authenticate } = build();

    const { token } = await login({ username: "owens", password: "demo1234" });
    const viewer = await authenticate(token);

    expect(viewer?.id).toBe("manager-owens");
    expect(viewer?.role).toBe("mop");
  });

  it("login is case/whitespace insensitive", async () => {
    const { login, authenticate } = build();
    const { token } = await login({ username: "  OWENS  ", password: "demo1234" });
    expect((await authenticate(token))?.id).toBe("manager-owens");
  });

  it("rejects an incorrect password", async () => {
    const { login } = build();
    await expect(login({ username: "owens", password: "wrong" })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("rejects a nonexistent user", async () => {
    const { login } = build();
    await expect(login({ username: "nobody", password: "demo1234" })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
  });

  it("authenticate returns null for an empty/unknown token", async () => {
    const { authenticate } = build();
    expect(await authenticate(undefined)).toBeNull();
    expect(await authenticate("garbage")).toBeNull();
  });

  it("after logout the token is no longer valid", async () => {
    const { login, authenticate, logout } = build();
    const { token } = await login({ username: "owens", password: "demo1234" });
    await logout(token);
    expect(await authenticate(token)).toBeNull();
  });
});
