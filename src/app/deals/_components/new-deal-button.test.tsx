import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewDealButton } from "./new-deal-button";

vi.mock("../actions", () => ({
  createDealAction: vi.fn(),
}));

const clients = [
  { id: "c1", name: "Amber Bakery" },
  { id: "c2", name: "Deluxe Confectionery" },
];
const managers = [{ id: "owens", name: "Daniel Owens" }];

describe("NewDealButton", () => {
  it("autoOpen + initialClientId: the modal is open with the pre-selected client", () => {
    render(
      <NewDealButton
        clients={clients}
        managers={managers}
        currentUserId="owens"
        autoOpen
        initialClientId="c1"
      />,
    );

    // The modal is open (heading "New deal" in the dialog).
    expect(screen.getByRole("heading", { name: "New deal" })).toBeTruthy();
    // The hidden clientId field is already = c1. The modal renders via a portal into
    // document.body, so we search the document, not the render container.
    const hidden = document.querySelector('input[name="clientId"]') as HTMLInputElement;
    expect(hidden.value).toBe("c1");
    // The combobox shows the pre-selected client's name.
    expect(screen.getByDisplayValue("Amber Bakery")).toBeTruthy();
  });

  it("without autoOpen the modal is closed", () => {
    render(<NewDealButton clients={clients} managers={managers} currentUserId="owens" />);
    expect(screen.queryByRole("heading", { name: "New deal" })).toBeNull();
  });
});
