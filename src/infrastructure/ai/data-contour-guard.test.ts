import { describe, expect, it } from "vitest";
import {
  assertCleanForGlobalContour,
  DataContourViolationError,
  findDataPolicyViolations,
} from "./data-contour-guard";

describe("findDataPolicyViolations", () => {
  it("catches USD prices", () => {
    const v = findDataPolicyViolations("Individual client price $742.50, plus $1,180,000.00 more.");
    expect(v.some((x) => x.kind === "price")).toBe(true);
  });

  it("catches counterparties (LLC/Inc)", () => {
    const v = findDataPolicyViolations("Client Victoria Bay LLC, also Sidorov Inc.");
    expect(v.filter((x) => x.kind === "counterparty").length).toBeGreaterThanOrEqual(2);
  });

  it("catches Corp / Co without matching inside a longer word", () => {
    expect(
      findDataPolicyViolations("Sunrise Bakery Co.").some((x) => x.kind === "counterparty"),
    ).toBe(true);
    expect(findDataPolicyViolations("Millbrook Corp").some((x) => x.kind === "counterparty")).toBe(
      true,
    );
    // "Co" must not match inside "Company"
    expect(
      findDataPolicyViolations("Millbrook Company").filter((x) => x.kind === "counterparty"),
    ).toHaveLength(0);
  });

  it("catches a price given as a bare dollar amount", () => {
    expect(findDataPolicyViolations("$1,250").some((x) => x.kind === "price")).toBe(true);
    expect(findDataPolicyViolations("$189,000").some((x) => x.kind === "price")).toBe(true);
  });

  it("catches an EIN", () => {
    const v = findDataPolicyViolations("EIN 39-0645511 and also 39-0612345.");
    expect(v.some((x) => x.kind === "tax_id")).toBe(true);
  });

  it("clean text (a question with no trade secret) -- no violations", () => {
    expect(findDataPolicyViolations("Which deals have stalled with no next step?")).toHaveLength(0);
  });
});

describe("assertCleanForGlobalContour", () => {
  it("blocks a payload with a price", () => {
    expect(() => assertCleanForGlobalContour("Cost of goods $980")).toThrow(
      DataContourViolationError,
    );
  });

  it("passes a clean payload", () => {
    expect(() =>
      assertCleanForGlobalContour("Funnel summary: 12 deals, 40% win rate"),
    ).not.toThrow();
  });
});
