import type { SectionVisibility } from "@/domain/deal/deal-stage";
import { ClientMessageComposer } from "./client-message-composer";
import { ProposalComposer } from "./proposal-composer";

/**
 * Workspace for the "Proposal" stage per the design reference (CRM-PRO.dc.html:462-521):
 * the proposal renders directly in the stage card body (without a separate translucent
 * wrapper card with a heading), and the client message is separated by a thin
 * "CLIENT MESSAGE" divider row. A presentational wrapper over existing composers — the
 * numbers come from the ERP/calculations, AI drafts the text, a human confirms.
 */
export function QuoteWorkspace({
  dealId,
  clientId,
  products,
  visibility,
}: {
  dealId: string;
  clientId: string;
  products: readonly { id: string; name: string; price: number }[];
  visibility: SectionVisibility;
}) {
  if (visibility !== "active") {
    return <p className="muted">The proposal stage is complete.</p>;
  }

  return (
    <div>
      <ProposalComposer dealId={dealId} clientId={clientId} products={products} />

      {/* Divider row "CLIENT MESSAGE" (design ref CRM-PRO.dc.html:506) */}
      <div
        style={{
          marginTop: 20,
          marginBottom: 2,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{
            font: "600 11px Arial",
            color: "#9a9ea8",
            letterSpacing: ".5px",
          }}
        >
          CLIENT MESSAGE
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(60,50,40,0.08)" }} />
      </div>

      <ClientMessageComposer dealId={dealId} />
    </div>
  );
}
