import { describe, expect, it } from "vitest";
import { canRevert, canTransition, isTerminal, sectionVisibility } from "./deal-stage";

describe("canTransition", () => {
  it("allows a step forward through the funnel", () => {
    expect(canTransition("qualification", "audit")).toBe(true);
    expect(canTransition("quote", "completed")).toBe(true);
  });

  it("forbids skipping intermediate stages (but completed is reachable from any)", () => {
    expect(canTransition("qualification", "testing")).toBe(false);
    expect(canTransition("qualification", "quote")).toBe(false);
    expect(canTransition("qualification", "completed")).toBe(true);
    expect(canTransition("audit", "completed")).toBe(true);
  });

  it("no transitions out of terminal stages", () => {
    expect(canTransition("completed", "quote")).toBe(false);
  });
});

describe("isTerminal", () => {
  it("completed — terminal", () => {
    expect(isTerminal("completed")).toBe(true);
  });

  it("working stages are not terminal", () => {
    expect(isTerminal("qualification")).toBe(false);
    expect(isTerminal("quote")).toBe(false);
  });
});

describe("canRevert", () => {
  it("allows a revert to an earlier non-terminal stage", () => {
    expect(canRevert("quote", "audit")).toBe(true);
  });

  it("forbids reverting forward and into a terminal stage", () => {
    expect(canRevert("audit", "quote")).toBe(false);
    expect(canRevert("quote", "completed")).toBe(false);
  });
});

describe("sectionVisibility", () => {
  it("the current stage's section — active", () => {
    expect(sectionVisibility("audit", "audit")).toBe("active");
    expect(sectionVisibility("quote", "quote")).toBe("active");
  });

  it("a past section — readonly", () => {
    expect(sectionVisibility("audit", "testing")).toBe("readonly");
    expect(sectionVisibility("audit", "quote")).toBe("readonly");
  });

  it("a future section — locked", () => {
    expect(sectionVisibility("quote", "audit")).toBe("locked");
    expect(sectionVisibility("completed", "qualification")).toBe("locked");
  });

  it("at the first stage all special sections are locked", () => {
    expect(sectionVisibility("audit", "qualification")).toBe("locked");
    expect(sectionVisibility("testing", "qualification")).toBe("locked");
  });

  it("on a completed deal the completed section is active, past ones readonly", () => {
    expect(sectionVisibility("completed", "completed")).toBe("active");
    expect(sectionVisibility("quote", "completed")).toBe("readonly");
    expect(sectionVisibility("audit", "completed")).toBe("readonly");
  });

  it("on a completed deal, previous sections are readonly", () => {
    expect(sectionVisibility("audit", "completed")).toBe("readonly");
    expect(sectionVisibility("quote", "completed")).toBe("readonly");
  });
});
