import { describe, expect, it } from "vitest";
import { formLines, formNumber, formText } from "./form-data";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe("formNumber", () => {
  it("parses a number and accepts a comma as the separator", () => {
    expect(formNumber(fd({ x: "12,5" }), "x")).toBe(12.5);
    expect(formNumber(fd({ x: "100" }), "x")).toBe(100);
  });
  it("empty/missing field → 0 (Number('') behavior, kept from the original num)", () => {
    expect(formNumber(fd({ x: "" }), "x")).toBe(0);
    expect(formNumber(fd({}), "x")).toBe(0);
  });
  it("a non-numeric string → NaN (caught by Number.isFinite at the call site)", () => {
    expect(formNumber(fd({ x: "abc" }), "x")).toBeNaN();
  });
});

describe("formLines", () => {
  it("splits by line, trims, and drops empty lines", () => {
    expect(formLines(fd({ x: "a\n\n  b \n c" }), "x")).toEqual(["a", "b", "c"]);
  });
  it("no field → empty array", () => {
    expect(formLines(fd({}), "x")).toEqual([]);
  });
});

describe("formText", () => {
  it("trims, empty/whitespace-only → null", () => {
    expect(formText(fd({ x: "  hello " }), "x")).toBe("hello");
    expect(formText(fd({ x: "   " }), "x")).toBeNull();
    expect(formText(fd({}), "x")).toBeNull();
  });
});
