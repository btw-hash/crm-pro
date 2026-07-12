import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { globalSearch } = vi.hoisted(() => ({ globalSearch: vi.fn() }));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("./command-palette-actions", () => ({ globalSearch }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { CommandPalette } from "./command-palette";

afterEach(() => {
  globalSearch.mockReset();
  push.mockReset();
});

function open() {
  act(() => {
    window.dispatchEvent(new Event("cmdk:open"));
  });
}

describe("CommandPalette", () => {
  it("is closed by default (nothing rendered)", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on the event, searches, and navigates on Enter", async () => {
    globalSearch.mockResolvedValue([
      {
        kind: "deal",
        id: "d1",
        label: "Flour supply",
        sublabel: "Harvest Gold",
        href: "/deals/d1",
      },
    ]);
    render(<CommandPalette />);
    open();

    const input = screen.getByRole("dialog").querySelector("input") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "flour" } });

    const hit = await screen.findByText("Flour supply");
    expect(hit).toBeTruthy();
    expect(globalSearch).toHaveBeenCalledWith("flour");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/deals/d1");
  });

  it("an empty query shows the navigation commands", () => {
    render(<CommandPalette />);
    open();
    expect(screen.getByText("Go to: Deals")).toBeTruthy();
  });
});
