import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountUp, formatNumber, parseNumber } from "./count-up";

describe("parseNumber", () => {
  it("keeps the currency sign, grouping and decimals", () => {
    const p = parseNumber("$374,530.00");
    expect(p).toEqual({ prefix: "$", target: 374530, decimals: 2, grouped: true, suffix: "" });
    expect(formatNumber(p!, 374530)).toBe("$374,530.00");
    expect(formatNumber(p!, 1234.5)).toBe("$1,234.50");
  });

  it("keeps a unit after the number", () => {
    const p = parseNumber("1,040 kg");
    expect(p).toMatchObject({ target: 1040, suffix: " kg", grouped: true });
    expect(formatNumber(p!, 20)).toBe("20 kg");
  });

  it("handles a bare integer", () => {
    const p = parseNumber("17");
    expect(formatNumber(p!, 8.6)).toBe("9");
  });

  it("returns null for text without a number", () => {
    expect(parseNumber("—")).toBeNull();
  });
});

describe("CountUp", () => {
  it("renders the final value as its text", () => {
    render(<CountUp value="$374,530.00" />);
    expect(screen.getByText("$374,530.00")).toBeInTheDocument();
  });
});
