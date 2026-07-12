"use client";

import { useState } from "react";
import type { Client } from "@/domain/client/client";
import { ClientFormModal } from "./client-form-modal";

export function EditClientButton({ client }: { readonly client: Client }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          border: "1px solid rgba(255,255,255,0.6)",
          background: "rgba(255,255,255,0.5)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "#16181d",
          font: "600 13px Arial",
          padding: "9px 16px",
          borderRadius: "24px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(31,45,80,0.06)",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Edit
      </button>
      {open ? <ClientFormModal mode="edit" client={client} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
