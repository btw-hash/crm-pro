import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tabs } from "./tabs";

describe("Tabs", () => {
  it("shows the first tab and switches content on click without a reload", () => {
    render(
      <Tabs
        tabs={[
          { key: "a", label: "Overview", content: <p>Overview content</p> },
          { key: "b", label: "Activities", content: <p>Activities content</p> },
        ]}
      />,
    );

    const panelA = screen.getByText("Overview content").closest("[role=tabpanel]");
    const panelB = screen.getByText("Activities content").closest("[role=tabpanel]");
    expect(panelA).not.toHaveAttribute("hidden");
    expect(panelB).toHaveAttribute("hidden");

    fireEvent.click(screen.getByRole("tab", { name: "Activities" }));

    expect(panelA).toHaveAttribute("hidden");
    expect(panelB).not.toHaveAttribute("hidden");
    // Both panels stay in the DOM (state is not lost) — A is merely hidden.
    expect(screen.getByText("Overview content")).toBeTruthy();
  });
});
