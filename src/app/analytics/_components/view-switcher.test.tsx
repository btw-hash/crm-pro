import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ViewSwitcher } from "./view-switcher";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

// Current URL has no query — the switcher should only add/remove its own parameter.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/analytics",
  useSearchParams: () => new URLSearchParams(""),
}));

const OPTIONS = [
  { value: "managers", label: "by manager" },
  { value: "products", label: "by product" },
] as const;

function renderSwitcher(value: "managers" | "products") {
  render(
    <ViewSwitcher
      param="view"
      prefix="Breakdown: "
      value={value}
      defaultValue="managers"
      options={OPTIONS}
    />,
  );
}

describe("ViewSwitcher", () => {
  beforeEach(() => push.mockReset());

  it("shows the current value on the button", () => {
    renderSwitcher("managers");
    expect(screen.getByRole("button", { name: /Breakdown: by manager/ })).toBeInTheDocument();
  });

  it("selecting a non-default value adds the parameter to the URL", () => {
    renderSwitcher("managers");
    fireEvent.click(screen.getByRole("button", { name: /Breakdown:/ }));
    fireEvent.click(screen.getByRole("option", { name: "by product" }));
    expect(push).toHaveBeenCalledWith("/analytics?view=products", { scroll: false });
  });

  it("selecting the default value removes the parameter (clean URL)", () => {
    renderSwitcher("products");
    fireEvent.click(screen.getByRole("button", { name: /Breakdown:/ }));
    fireEvent.click(screen.getByRole("option", { name: "by manager" }));
    expect(push).toHaveBeenCalledWith("/analytics", { scroll: false });
  });
});
