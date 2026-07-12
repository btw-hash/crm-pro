import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DealDrawerData } from "./drawer-actions";

const { getDealDrawerData } = vi.hoisted(() => ({ getDealDrawerData: vi.fn() }));
const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
const params = vi.hoisted(() => ({ value: "" }));

vi.mock("./drawer-actions", () => ({ getDealDrawerData }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/deals",
  useSearchParams: () => new URLSearchParams(params.value),
}));

import { DealDrawer } from "./deal-drawer";

const data: DealDrawerData = {
  id: "d1",
  title: "“Harvest Gold” — flour",
  stage: "quote",
  stageLabel: "Proposal negotiation",
  managerName: "Smith",
  managerInitials: "S",
  managerBg: "#1c1f27",
  clientId: "c1",
  clientName: "Harvest Gold",
  goalLabel: "New contract",
  comment: null,
  health: "attention",
  outcome: null,
  nextStep: { text: "Call back", dueDate: "2026-07-01" },
  track: [
    { label: "Qualification", bg: "#e7f5ee", color: "#197a48" },
    { label: "Tech request", bg: "#e7f5ee", color: "#197a48" },
    { label: "Test request", bg: "#e7f5ee", color: "#197a48" },
    { label: "Tech response", bg: "#e7f5ee", color: "#197a48" },
    { label: "Proposal negotiation", bg: "var(--accent)", color: "#fff" },
    { label: "Won", bg: "#efe9e2", color: "#6a5f54" },
  ],
  timeline: [
    {
      id: "a1",
      kindLabel: "Call",
      kind: "call",
      text: "Discussed volume",
      author: "Smith",
      at: "2026-06-20T10:00:00.000Z",
    },
  ],
  techRequestStatus: null,
};

afterEach(() => {
  getDealDrawerData.mockReset();
  replace.mockReset();
  params.value = "";
});

describe("DealDrawer", () => {
  it("renders nothing without ?deal in the URL", () => {
    params.value = "";
    render(<DealDrawer />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("deep-link: ?deal=<id> loads and shows the card with key fields", async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue(data);
    render(<DealDrawer />);

    expect(getDealDrawerData).toHaveBeenCalledWith("d1");
    expect(await screen.findByText("“Harvest Gold” — flour")).toBeTruthy();
    // Stage track — domain stages (same as on the full card): a completed one is visible.
    expect(screen.getByText("Test request")).toBeTruthy();
    // Goal is shown as a pill in the glass card.
    expect(screen.getByText("New contract")).toBeTruthy();
    // In the glass card — the current stage (domain stage label).
    expect(screen.getByText("Current stage")).toBeTruthy();
    expect(screen.getAllByText("Proposal negotiation").length).toBeGreaterThan(0);
    // The full-width link to the full deal page is present.
    expect(screen.getByRole("link", { name: /Open full deal page/ })).toBeTruthy();
  });

  it("header: colored health badge for attention; hidden for neutral", async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue(data); // health: "attention"
    const { unmount } = render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");
    expect(screen.getByText("Needs attention")).toBeTruthy();
    unmount();

    getDealDrawerData.mockResolvedValue({ ...data, health: "neutral" });
    params.value = "deal=d1";
    render(<DealDrawer />);
    await screen.findAllByText("“Harvest Gold” — flour");
    // No health label is shown for a terminal (neutral) deal.
    expect(screen.queryByText("Needs attention")).toBeNull();
    expect(screen.queryByText("Healthy")).toBeNull();
    expect(screen.queryByText("Critical")).toBeNull();
  });

  it('meta line: shows a deterministic "N days on stage"', async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue(data);
    render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");
    // The demo derivative is deterministic by id — the exact text is stable.
    expect(screen.getByText(/\d+ days? on stage/)).toBeTruthy();
  });

  it("Esc closes the drawer — removes ?deal from the URL", async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue(data);
    render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(replace).toHaveBeenCalledWith("/deals", { scroll: false });
  });

  it("clicking outside the panel closes the drawer", async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue(data);
    render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");

    // Click on the overlay (not on the panel) closes it.
    fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(replace).toHaveBeenCalledWith("/deals", { scroll: false });
  });

  it("clicking inside the panel does NOT close the drawer", async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue(data);
    render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");

    fireEvent.click(screen.getByRole("dialog"));
    expect(replace).not.toHaveBeenCalled();
  });

  it('RBAC: an inaccessible deal (action returned null) — shows "unavailable", not the card', async () => {
    params.value = "deal=secret";
    getDealDrawerData.mockResolvedValue(null);
    render(<DealDrawer />);

    expect(await screen.findByText(/unavailable or not found/i)).toBeTruthy();
    expect(screen.queryByText("“Harvest Gold” — flour")).toBeNull();
  });

  it("shows the outcome badge for a completed deal (Won/Lost)", async () => {
    params.value = "deal=d1";
    getDealDrawerData.mockResolvedValue({
      ...data,
      outcome: { outcome: "lost", label: "Lost", bg: "#f7e4e2", color: "var(--accent)" },
    });
    render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");

    expect(screen.getByText(/Lost/)).toBeTruthy();
  });

  it("preserves other query params when closing (e.g. ?view=)", async () => {
    params.value = "view=critical&deal=d1";
    getDealDrawerData.mockResolvedValue(data);
    render(<DealDrawer />);
    await screen.findByText("“Harvest Gold” — flour");

    fireEvent.keyDown(window, { key: "Escape" });
    expect(replace).toHaveBeenCalledWith("/deals?view=critical", { scroll: false });
  });
});
