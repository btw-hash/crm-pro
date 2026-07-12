import type { DealOutcome } from "@/domain/deal/deal-stage";
import { setDealOutcomeAction } from "../actions";

const OPTIONS: ReadonlyArray<{
  value: DealOutcome;
  label: string;
  activeBg: string;
  activeColor: string;
}> = [
  { value: "won", label: "Won", activeBg: "rgba(31,158,108,0.14)", activeColor: "#197a48" },
  {
    value: "lost",
    label: "Lost",
    activeBg: "rgba(191,50,43,0.12)",
    activeColor: "var(--accent)",
  },
];

/**
 * Records the outcome of a completed process (#397 [24]): "Won"/"Lost" buttons.
 * Show only on the "Won/Completed" stage (the domain enforces this too). Works without JS —
 * form + server action; revalidate updates the badge and the order form.
 */
export function DealOutcomeControls({
  dealId,
  outcome,
}: {
  dealId: string;
  outcome?: DealOutcome;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {OPTIONS.map((o) => {
        const active = outcome === o.value;
        return (
          <form key={o.value} action={setDealOutcomeAction}>
            <input type="hidden" name="dealId" value={dealId} />
            <input type="hidden" name="outcome" value={o.value} />
            <button
              type="submit"
              title={active ? "Current outcome" : `Mark as "${o.label}"`}
              style={{
                border: `1px solid ${active ? o.activeColor : "rgba(120,130,150,0.3)"}`,
                background: active ? o.activeBg : "rgba(255,255,255,0.6)",
                color: active ? o.activeColor : "#6a5f54",
                font: `${active ? 700 : 500} 13px Arial`,
                padding: "8px 14px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              {active ? "✓ " : ""}
              {o.label}
            </button>
          </form>
        );
      })}
    </div>
  );
}
