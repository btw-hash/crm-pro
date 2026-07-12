"use client";

import { useState } from "react";
import { CreateDealModal } from "./create-deal-modal";

interface ClientOption {
  readonly id: string;
  readonly name: string;
}

interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

interface NewDealButtonProps {
  readonly clients: readonly ClientOption[];
  readonly managers: readonly ManagerOption[];
  readonly currentUserId: string;
  /** Open the modal immediately on mount (arriving from the client card). */
  readonly autoOpen?: boolean;
  /** Pre-selected client in the create form. */
  readonly initialClientId?: string;
}

export function NewDealButton({
  clients,
  managers,
  currentUserId,
  autoOpen = false,
  initialClientId,
}: NewDealButtonProps) {
  const [open, setOpen] = useState(autoOpen);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          border: "none",
          background: "#1c1f27",
          color: "#fff",
          font: "600 13px Arial",
          padding: "11px 16px",
          borderRadius: 24,
          display: "flex",
          alignItems: "center",
          gap: 7,
          cursor: "pointer",
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          aria-hidden="true"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New deal
      </button>
      {open ? (
        <CreateDealModal
          clients={clients}
          managers={managers}
          currentUserId={currentUserId}
          initialClientId={initialClientId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
