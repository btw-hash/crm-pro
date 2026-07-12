"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { ClientOption } from "@/app/deals/_components/client-combobox";
import type { ProductOption } from "@/app/_components/product-lines";
import { CreateRequestModal } from "@/app/_components/create-request-modal";

interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Global "New request" button (#0055): opens a window to choose between
 * Deal / Shipment / Add-on request.
 */
// Full-width glass button for the sidebar (the historical "create" in the menu).
const SIDEBAR_STYLE: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,.09)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,.2)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  font: "700 14px Arial",
  padding: 13,
  borderRadius: 15,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 9,
  marginBottom: 14,
  cursor: "pointer",
};

const PILL_STYLE: React.CSSProperties = {
  border: "none",
  background: "#BF322B",
  color: "#fff",
  font: "600 13px Arial",
  padding: "11px 16px",
  borderRadius: 24,
  display: "flex",
  alignItems: "center",
  gap: 7,
  cursor: "pointer",
};

// Square "+" icon for the collapsed rail — reference-design geometry.
const RAIL_STYLE: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 14,
  background: "#BF322B",
  color: "#fff",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  marginBottom: 14,
  boxShadow: "0 6px 15px rgba(191,50,43,0.32)",
};

export function CreateRequestButton({
  clients,
  managers,
  products,
  currentUserId,
  autoOpen = false,
  initialClientId,
  variant = "default",
}: {
  readonly clients: readonly ClientOption[];
  readonly managers: readonly ManagerOption[];
  readonly products: readonly ProductOption[];
  readonly currentUserId: string;
  readonly autoOpen?: boolean;
  readonly initialClientId?: string;
  readonly variant?: "default" | "sidebar" | "rail";
}) {
  const [open, setOpen] = useState(autoOpen);
  const railStyle = variant === "rail";
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={railStyle ? "New request" : undefined}
        aria-label={railStyle ? "New request" : undefined}
        style={railStyle ? RAIL_STYLE : variant === "sidebar" ? SIDEBAR_STYLE : PILL_STYLE}
      >
        <Plus
          size={railStyle ? 22 : variant === "sidebar" ? 18 : 15}
          strokeWidth={2.6}
          aria-hidden
        />
        {railStyle ? null : "New request"}
      </button>
      {open ? (
        <CreateRequestModal
          clients={clients}
          managers={managers}
          products={products}
          currentUserId={currentUserId}
          initialClientId={initialClientId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
