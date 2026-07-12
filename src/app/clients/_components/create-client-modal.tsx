"use client";

import { useActionState, useEffect } from "react";
import { ModalOverlay } from "@/app/_components/modal-overlay";
import type { CreateClientResult } from "../actions";
import { createClientAction } from "../actions";

interface CreateClientModalProps {
  readonly onClose: () => void;
  readonly onCreated?: (clientId: string) => void;
}

const INITIAL: CreateClientResult | null = null;

export function CreateClientModal({ onClose, onCreated }: CreateClientModalProps) {
  const [state, formAction, pending] = useActionState(createClientAction, INITIAL);

  useEffect(() => {
    if (state?.ok) {
      onCreated?.(state.clientId);
      onClose();
    }
  }, [state, onClose, onCreated]);

  return (
    <ModalOverlay ariaLabel="New client" onClose={onClose}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>New client</h3>
      <form action={formAction} className="form">
        <label>
          Name <span style={{ color: "var(--accent)" }}>*</span>
          <input name="name" required placeholder="Amber Bakery" autoFocus />
        </label>
        <label>
          City
          <input name="city" placeholder="Portland" />
        </label>
        <label>
          EIN
          <input name="ein" placeholder="12-3456789" maxLength={12} />
        </label>
        {state && !state.ok ? <p className="error">{state.error}</p> : null}
        <div className="stage-controls">
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Saving…" : "Create client"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
