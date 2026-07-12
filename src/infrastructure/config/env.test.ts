import { describe, expect, it } from "vitest";
import { loadEnv } from "./env";

describe("loadEnv", () => {
  it('an empty string in .env is treated as "not set" (default/?? kicks in)', () => {
    const env = loadEnv({ AI_MODE: "", AI_BASE_URL: "", AI_MODEL: "" });
    expect(env.AI_MODE).toBe("stub"); // the default applied
    // undefined, not "" -- otherwise the consumer's `?? fallback` wouldn't kick in
    // (a broken URL/model).
    expect(env.AI_BASE_URL).toBeUndefined();
    expect(env.AI_MODEL).toBeUndefined();
  });

  it("set values pass through as-is", () => {
    const env = loadEnv({
      AI_MODE: "live",
      AI_PROVIDER: "openai",
      AI_API_KEY: "k",
    });
    expect(env.AI_MODE).toBe("live");
    expect(env.AI_PROVIDER).toBe("openai");
    expect(env.AI_API_KEY).toBe("k");
  });
});
