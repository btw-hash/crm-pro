import { describe, expect, it } from "vitest";
import { currentStageTodo } from "./deal-stage-progress";

const base = { hasAudit: false, sampleCount: 0, hasTestAct: false };

describe("currentStageTodo", () => {
  it("audit: no audit → hint; audit present → null", () => {
    expect(currentStageTodo({ ...base, stage: "audit" })).toMatch(/Tech request/);
    expect(currentStageTodo({ ...base, stage: "audit", hasAudit: true })).toBeNull();
  });

  it("testing: no test act → hint; act present → null", () => {
    expect(currentStageTodo({ ...base, stage: "testing" })).toMatch(/Test act/);
    expect(currentStageTodo({ ...base, stage: "testing", hasTestAct: true })).toBeNull();
  });

  it("stages with no required action on the card → null", () => {
    for (const stage of ["qualification", "quote", "completed"] as const) {
      expect(currentStageTodo({ ...base, stage })).toBeNull();
    }
  });
});
