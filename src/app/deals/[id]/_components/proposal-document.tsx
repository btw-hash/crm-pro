import { Money } from "@/domain/pricing/money";
import {
  proposalGrandTotalUsd,
  proposalLineTotalUsd,
  type ProposalStatus,
  type SavedProposal,
} from "@/domain/proposal/saved-proposal";

const STATUS_LABEL: Record<ProposalStatus, string> = {
  draft: "draft",
  sent: "sent to client",
  approved: "approved by client",
  declined: "client declined",
};

const STATUS_TONE: Record<ProposalStatus, { bg: string; fg: string }> = {
  draft: { bg: "#fbf1d6", fg: "#9a6a00" },
  sent: { bg: "#e7eef9", fg: "#2f5fb0" },
  approved: { bg: "#e7f5ee", fg: "#197a48" },
  declined: { bg: "#f7e4e2", fg: "#bf322b" },
};

function fmtUsd(amount: number): string {
  return Money.dollars(amount).format();
}

/**
 * Proposal document at the "Completed" stage (#462 §4): renders the proposal built during
 * "Proposal negotiation" as a finished document (header, line items, total, cover text).
 * Read-only — data comes from the saved proposal (`SavedProposal`); prices are manual
 * (from the proposal), AI only drafted the cover text.
 */
export function ProposalDocument({
  proposal,
  clientName,
}: {
  proposal: SavedProposal;
  clientName: string;
}) {
  const docNo = `PROP-2026-${String(proposal.dealId).slice(-4).padStart(4, "0")}`;
  const dateLabel = new Date(proposal.savedAt).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const total = proposalGrandTotalUsd(proposal.lines);
  const tone = STATUS_TONE[proposal.status];

  return (
    <div
      style={{
        border: "1px solid #e7e0d7",
        borderRadius: 16,
        background: "#fffdfb",
        boxShadow: "0 14px 40px rgba(31,45,80,0.10)",
        overflow: "hidden",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "17px 20px",
          borderBottom: "1px solid #f1ece5",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              background: "#BF322B",
              color: "#fff",
              font: "800 17px Arial",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            M
          </span>
          <div>
            <div style={{ font: "700 15px Arial", color: "#16181d" }}>Proposal</div>
            <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginTop: 2 }}>
              No. {docNo} · {dateLabel}
              {proposal.revision > 1 ? ` · revision #${proposal.revision}` : ""}
            </div>
          </div>
        </div>
        <span
          style={{
            font: "600 11px Arial",
            color: tone.fg,
            background: tone.bg,
            borderRadius: 999,
            padding: "5px 11px",
            whiteSpace: "nowrap",
          }}
        >
          {STATUS_LABEL[proposal.status]}
        </span>
      </div>

      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ font: "400 10.5px Arial", color: "#9a9ea8", marginBottom: 3 }}>To</div>
            <div style={{ font: "700 14px Arial", color: "#16181d" }}>{clientName}</div>
          </div>
          <div>
            <div style={{ font: "400 10.5px Arial", color: "#9a9ea8", marginBottom: 3 }}>From</div>
            <div style={{ font: "600 14px Arial", color: "#16181d" }}>Millbrook Foods</div>
          </div>
        </div>

        <div style={{ border: "1px solid #f0eae2", borderRadius: 11, overflow: "hidden" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              background: "#f7f2ec",
              font: "700 10px Arial",
              color: "#8b90a0",
              letterSpacing: ".4px",
            }}
          >
            <span style={{ flex: 1 }}>ITEM</span>
            <span style={{ width: 92, textAlign: "right" }}>PRICE</span>
            <span style={{ width: 92, textAlign: "right" }}>QTY</span>
            <span style={{ width: 104, textAlign: "right" }}>TOTAL</span>
          </div>
          {proposal.lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "11px 14px",
                borderTop: "1px solid #f4efe8",
              }}
            >
              <span style={{ flex: 1, font: "600 13px Arial", color: "#16181d" }}>
                {line.productName}
              </span>
              <span
                style={{ width: 92, textAlign: "right", font: "400 13px Arial", color: "#6b6f78" }}
              >
                {fmtUsd(line.unitPriceUsd)}
              </span>
              <span
                style={{ width: 92, textAlign: "right", font: "400 13px Arial", color: "#6b6f78" }}
              >
                {line.quantity}&nbsp;{line.unit}
              </span>
              <span
                style={{ width: 104, textAlign: "right", font: "700 13px Arial", color: "#16181d" }}
              >
                {fmtUsd(proposalLineTotalUsd(line))}
              </span>
            </div>
          ))}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 14px",
              borderTop: "1.5px solid #ece4da",
              background: "#faf6f1",
            }}
          >
            <span style={{ flex: 1, font: "700 13px Arial", color: "#16181d" }}>Total</span>
            <span style={{ width: 92 }} />
            <span style={{ width: 92 }} />
            <span
              style={{ width: 104, textAlign: "right", font: "800 15px Arial", color: "#16181d" }}
            >
              {fmtUsd(total)}
            </span>
          </div>
        </div>

        {proposal.prose.trim() ? (
          <div
            style={{
              marginTop: 14,
              font: "400 13px/1.6 Arial",
              color: "#33373f",
              whiteSpace: "pre-wrap",
            }}
          >
            {proposal.prose}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            paddingTop: 13,
            borderTop: "1px solid #f1ece5",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <span style={{ font: "400 11px Arial", color: "#9a9ea8" }}>
            Prices valid for 14 days · Sales tax included.
          </span>
          <span style={{ font: "600 12px Arial", color: "#16181d" }}>Millbrook Foods</span>
        </div>
      </div>
    </div>
  );
}
