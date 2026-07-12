"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { DEAL_GOAL_LABELS, DEAL_GOALS } from "@/domain/deal/deal-goal";
import { ModalOverlay } from "@/app/_components/modal-overlay";
import type { DealMutationResult } from "../actions";
import { createDealAction } from "../actions";
import { ClientCombobox, type ClientOption } from "./client-combobox";

interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

interface CreateDealModalProps {
  readonly clients: readonly ClientOption[];
  readonly managers: readonly ManagerOption[];
  readonly currentUserId: string;
  readonly onClose: () => void;
  /** Preselected client (e.g. when creating a deal from a client card). */
  readonly initialClientId?: string;
}

const INITIAL: DealMutationResult | null = null;

export function CreateDealModal({
  clients,
  managers,
  currentUserId,
  onClose,
  initialClientId,
}: CreateDealModalProps) {
  const [state, formAction, pending] = useActionState(createDealAction, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedClientId, setSelectedClientId] = useState(initialClientId ?? "");
  const [newClientName, setNewClientName] = useState("");
  const [showInlineCreate, setShowInlineCreate] = useState(false);

  useEffect(() => {
    if (state?.ok) {
      onClose();
    }
  }, [state, onClose]);

  function handleClientChange(clientId: string, clientName: string) {
    setSelectedClientId(clientId);
    if (!clientId) {
      setNewClientName(clientName);
    } else {
      setNewClientName("");
      setShowInlineCreate(false);
    }
  }

  function handleNewClientRequest(name: string) {
    setNewClientName(name);
    setShowInlineCreate(true);
    setSelectedClientId("");
  }

  return (
    <ModalOverlay ariaLabel="New deal" onClose={onClose} maxWidth={520}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>New deal</h3>
      <form ref={formRef} action={formAction} className="form">
        {/* hidden field — populated by combobox selection or inline create */}
        <input type="hidden" name="clientId" value={selectedClientId} />

        <label>
          Client
          <ClientCombobox
            clients={clients}
            value={selectedClientId}
            onChange={handleClientChange}
            onNewClient={handleNewClientRequest}
          />
        </label>

        {showInlineCreate ? (
          <div
            style={{
              border: "1px dashed var(--border)",
              borderRadius: 8,
              padding: "0.8rem",
              background: "#fafcfe",
              display: "flex",
              flexDirection: "column",
              gap: "0.4rem",
            }}
          >
            <p
              style={{
                margin: "0 0 0.4rem",
                fontSize: "0.85rem",
                color: "var(--muted)",
              }}
            >
              A new client will be created together with the deal
            </p>
            <label>
              Client name
              <input
                name="newClientName"
                required={showInlineCreate}
                defaultValue={newClientName}
                placeholder="Amber Bakery"
              />
            </label>
            <label>
              City
              <input name="newClientCity" placeholder="Portland" />
            </label>
            <label>
              EIN
              <input name="newClientInn" placeholder="12-3456789" maxLength={12} />
            </label>
          </div>
        ) : null}

        <label>
          Deal title
          <input name="title" required placeholder="Onboard a new SKU" />
        </label>
        <label>
          Goal
          <select name="goal" defaultValue="other">
            {DEAL_GOALS.map((g) => (
              <option key={g} value={g}>
                {DEAL_GOAL_LABELS[g]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Owner
          <select name="responsibleManagerId" defaultValue={currentUserId}>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Comment
          <textarea name="comment" rows={2} placeholder="Extra context on the deal (optional)" />
        </label>
        {state && !state.ok ? <p className="error">{state.error}</p> : null}
        <div className="stage-controls">
          <button type="submit" className="btn btn--primary" disabled={pending}>
            {pending ? "Saving…" : "Create deal"}
          </button>
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
