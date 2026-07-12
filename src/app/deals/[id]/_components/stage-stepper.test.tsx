import { describe, expect, it } from "vitest";
import { FUNNEL_TRACK } from "@/domain/deal/deal-stage";
import { stepStates } from "./stage-stepper";

describe("stepStates", () => {
  it("marks past steps as done, the current one as current, future ones as upcoming", () => {
    const states = stepStates("testing"); // index 3 in the track
    const idx = FUNNEL_TRACK.indexOf("testing");
    expect(states[idx]).toBe("current");
    expect(states[idx - 1]).toBe("done");
    expect(states[idx + 1]).toBe("upcoming");
  });

  it("has no done steps at the first stage", () => {
    const states = stepStates("qualification");
    expect(states[0]).toBe("current");
    expect(states.includes("done")).toBe(false);
  });

  it("marks the whole track as done for a completed deal (terminal — done, not current)", () => {
    const states = stepStates("completed");
    expect(states.every((s) => s === "done")).toBe(true);
  });

  it("has the same length as the funnel track", () => {
    expect(stepStates("audit")).toHaveLength(FUNNEL_TRACK.length);
  });
});
