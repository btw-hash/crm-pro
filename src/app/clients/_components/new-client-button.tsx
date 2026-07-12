"use client";

import { useState } from "react";
import { ClientFormModal } from "./client-form-modal";

export function NewClientButton() {
  const [open, setOpen] = useState(false);

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
          borderRadius: "24px",
          display: "flex",
          alignItems: "center",
          gap: "7px",
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
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        New client
      </button>
      {open ? <ClientFormModal mode="create" onClose={() => setOpen(false)} /> : null}
    </>
  );
}
