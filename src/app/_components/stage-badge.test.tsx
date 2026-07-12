import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageBadge } from "./stage-badge";

describe("StageBadge", () => {
  it("displays the stage label", () => {
    render(<StageBadge stage="testing" />);
    expect(screen.getByTestId("stage-badge").textContent).toBe("Tech response");
  });
});
