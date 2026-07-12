import { describe, expect, it } from "vitest";
import { AsyncLocalStorageLlmFeatureScope } from "./llm-feature-scope";

describe("AsyncLocalStorageLlmFeatureScope", () => {
  it("current() returns the active tag inside run and null outside it", async () => {
    const scope = new AsyncLocalStorageLlmFeatureScope();

    expect(scope.current()).toBeNull();
    await scope.run("assistant_plan", async () => {
      expect(scope.current()).toBe("assistant_plan");
    });
    expect(scope.current()).toBeNull();
  });

  it("a nested run overrides the tag only inside its own fn (ReAct loop)", async () => {
    const scope = new AsyncLocalStorageLlmFeatureScope();

    await scope.run("web_answer", async () => {
      expect(scope.current()).toBe("web_answer");
      await scope.run("assistant_plan", async () => {
        expect(scope.current()).toBe("assistant_plan");
      });
      expect(scope.current()).toBe("web_answer");
    });
  });

  it("parallel runs are isolated — they don't see each other's tags", async () => {
    const scope = new AsyncLocalStorageLlmFeatureScope();

    const a = scope.run("voice_to_act", async () => {
      await new Promise((r) => setTimeout(r, 5));
      return scope.current();
    });
    const b = scope.run("web_answer", async () => scope.current());

    expect(await Promise.all([a, b])).toEqual(["voice_to_act", "web_answer"]);
  });
});
