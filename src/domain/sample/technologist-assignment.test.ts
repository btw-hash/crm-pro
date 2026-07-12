import { describe, expect, it } from "vitest";
import { NoTechnologistsError, pickNextTechnologist } from "./technologist-assignment";

const technologists = ["tech-a", "tech-b", "tech-c"];

describe("pickNextTechnologist", () => {
  it("with no previous assignment, returns the first technologist", () => {
    expect(pickNextTechnologist(technologists)).toBe("tech-a");
    expect(pickNextTechnologist(technologists, null)).toBe("tech-a");
  });

  it("cycles through technologists in order", () => {
    expect(pickNextTechnologist(technologists, "tech-a")).toBe("tech-b");
    expect(pickNextTechnologist(technologists, "tech-b")).toBe("tech-c");
  });

  it("wraps around from the end of the list back to the start", () => {
    expect(pickNextTechnologist(technologists, "tech-c")).toBe("tech-a");
  });

  it("starts from the first when the previous technologist is unknown", () => {
    expect(pickNextTechnologist(technologists, "tech-left-the-company")).toBe("tech-a");
  });

  it("throws a domain error on an empty list of technologists", () => {
    expect(() => pickNextTechnologist([])).toThrow(NoTechnologistsError);
    expect(() => pickNextTechnologist([], "tech-a")).toThrow(NoTechnologistsError);
  });
});
