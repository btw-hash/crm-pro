import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DealsKanban, type KanbanDeal } from "./deals-kanban";

const { advanceStageAction, revertStageAction } = vi.hoisted(() => ({
  advanceStageAction: vi.fn(),
  revertStageAction: vi.fn(),
}));
vi.mock("../actions", () => ({
  advanceStageAction,
  revertStageAction,
}));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/deals",
  useSearchParams: () => new URLSearchParams(""),
}));

const deal: KanbanDeal = {
  id: "d1",
  title: "Deal",
  stage: "audit",
  clientId: "c1",
  clientName: "Client",
  managerName: "Owens",
  goal: "other",
  needsNextStep: false,
  daysOnStage: null,
  stale: false,
  health: "healthy",
  isMine: true,
};

/** Drags card d1 onto the column with heading `columnLabel`. */
function dropOnColumn(columnLabel: string) {
  const column = screen.getByText(columnLabel).closest(".kanban__col");
  if (!column) throw new Error(`column "${columnLabel}" not found`);
  fireEvent.drop(column, { dataTransfer: { getData: () => "d1" } });
}

afterEach(() => {
  advanceStageAction.mockReset();
  revertStageAction.mockReset();
  push.mockReset();
  window.localStorage.clear();
});

describe("DealsKanban", () => {
  it("dragging forward calls advanceStageAction with the target stage", async () => {
    advanceStageAction.mockResolvedValue({ ok: true, deal: {} });
    render(<DealsKanban deals={[deal]} />);

    // From "Tech request" the transition to "Proposal" (quote) is available.
    dropOnColumn("Proposal");

    expect(advanceStageAction).toHaveBeenCalledWith({ dealId: "d1", to: "quote" });
  });

  it("a transition error shows a message (optimistic rollback)", async () => {
    advanceStageAction.mockResolvedValue({ ok: false, error: "Deal not found" });
    render(<DealsKanban deals={[deal]} />);

    dropOnColumn("Proposal");

    await screen.findByText("Deal not found");
  });

  it("dragging backward — revert via an in-app modal (not window.prompt), with a reason", async () => {
    revertStageAction.mockResolvedValue({ ok: true, deal: {} });
    render(<DealsKanban deals={[deal]} />);

    // From "Tech request" back to — "Qualification" (revert).
    dropOnColumn("Qualification");

    const dialog = await screen.findByRole("dialog");
    const input = dialog.querySelector("input");
    expect(input).toBeTruthy();
    fireEvent.change(input as HTMLInputElement, { target: { value: "dragged by mistake" } });
    fireEvent.click(screen.getByRole("button", { name: "↩ Revert" }));

    expect(revertStageAction).toHaveBeenCalledWith({
      dealId: "d1",
      toStage: "qualification",
      reason: "dragged by mistake",
    });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("clicking the card title opens the side drawer via ?deal=<id>", () => {
    render(<DealsKanban deals={[deal]} />);
    fireEvent.click(screen.getByRole("button", { name: /Deal/ }));
    expect(push).toHaveBeenCalledWith("/deals?deal=d1", { scroll: false });
  });

  it('the "Critical" view filters the board by health=critical', () => {
    const deals = [
      { ...deal, id: "ok", title: "Healthy one", health: "healthy" as const },
      { ...deal, id: "bad", title: "Critical one", health: "critical" as const },
    ];
    render(<DealsKanban deals={deals} />);
    // By default the "All" view is active — both are visible.
    expect(screen.getByText("Healthy one")).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: /Critical/ }));
    // After switching, only the critical one is visible.
    expect(screen.queryByText("Healthy one")).toBeNull();
    expect(screen.getByText("Critical one")).toBeTruthy();
  });

  it("shows the deal-health Score Pill (critical) with a tooltip", () => {
    render(<DealsKanban deals={[{ ...deal, health: "critical" }]} />);
    const dot = screen.getByLabelText(/Critical/);
    expect(dot.className).toContain("health-dot--critical");
  });

  it("a terminal deal has no health pill (neutral)", () => {
    render(<DealsKanban deals={[{ ...deal, stage: "completed", health: "neutral" }]} />);
    expect(screen.queryByLabelText(/Critical|attention|In progress/)).toBeNull();
  });

  it("does not show an outcome badge on a completed deal's card (not in the design reference)", () => {
    render(
      <DealsKanban deals={[{ ...deal, stage: "completed", outcome: "won", health: "neutral" }]} />,
    );
    // Per the design reference (deal card, p. 1247), there is no separate
    // "Won/Lost" badge on the board card — the outcome shows in the drawer/deal card.
    expect(screen.queryByText(/Won|Lost/)).toBeNull();
  });

  it("does not show an outcome badge on an active deal", () => {
    render(<DealsKanban deals={[deal]} />);
    expect(screen.queryByText(/Won|Lost/)).toBeNull();
  });

  it("a new deal from a revalidate (updated deals prop) appears without a remount", () => {
    const { rerender } = render(<DealsKanban deals={[deal]} />);
    expect(screen.queryByText("New deal")).toBeNull();
    // The RSC sends a new array after revalidatePath('/deals') — the board must
    // sync, not get stuck on the mount-time snapshot (otherwise the card isn't
    // visible until a manual reload).
    rerender(<DealsKanban deals={[deal, { ...deal, id: "d2", title: "New deal" }]} />);
    expect(screen.getByText("New deal")).toBeTruthy();
  });
});
