"use client";

import { useActionState, useEffect, useState } from "react";
import { DEAL_GOAL_LABELS, DEAL_GOALS } from "@/domain/deal/deal-goal";
import { DEAL_TYPE_LABELS, DEAL_TYPES } from "@/domain/deal/deal-type";
import { ModalOverlay } from "@/app/_components/modal-overlay";
import { ProductLines, type ProductOption } from "@/app/_components/product-lines";
import { ClientCombobox, type ClientOption } from "@/app/deals/_components/client-combobox";
import { createDealAction, type DealMutationResult } from "@/app/deals/actions";
import {
  createAdditionalOrderAction,
  createShipmentAction,
  type CreateRequestResult,
} from "@/app/_components/create-request-actions";

interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

type Tab = "process" | "shipment" | "additional";

const TABS: { value: Tab; label: string }[] = [
  { value: "process", label: "Deal" },
  { value: "shipment", label: "Shipment" },
  { value: "additional", label: "Add-on request" },
];

export function CreateRequestModal({
  clients,
  managers,
  products,
  currentUserId,
  initialClientId,
  onClose,
}: {
  readonly clients: readonly ClientOption[];
  readonly managers: readonly ManagerOption[];
  readonly products: readonly ProductOption[];
  readonly currentUserId: string;
  readonly initialClientId?: string;
  readonly onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("process");
  const [clientId, setClientId] = useState(initialClientId ?? "");

  const [processState, processAction, processPending] = useActionState<
    DealMutationResult | null,
    FormData
  >(createDealAction, null);
  const [shipState, shipAction, shipPending] = useActionState<CreateRequestResult | null, FormData>(
    createShipmentAction,
    null,
  );
  const [addState, addAction, addPending] = useActionState<CreateRequestResult | null, FormData>(
    createAdditionalOrderAction,
    null,
  );

  useEffect(() => {
    if (processState?.ok || shipState?.ok || addState?.ok) {
      onClose();
    }
  }, [processState, shipState, addState, onClose]);

  const clientField = (
    <label>
      Client
      <input type="hidden" name="clientId" value={clientId} />
      <ClientCombobox clients={clients} value={clientId} onChange={(id) => setClientId(id)} />
    </label>
  );

  return (
    <ModalOverlay ariaLabel="New request" onClose={onClose} maxWidth={560}>
      <h3 style={{ margin: "0 0 0.8rem", fontSize: "1.05rem" }}>New request</h3>

      <div
        role="tablist"
        style={{ display: "flex", gap: 6, marginBottom: "1rem", flexWrap: "wrap" }}
      >
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            style={{
              border: "1px solid var(--border)",
              background: tab === t.value ? "#1c1f27" : "#fff",
              color: tab === t.value ? "#fff" : "#16181d",
              font: "600 13px Arial",
              padding: "8px 16px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "process" ? (
        <form action={processAction} className="form">
          {clientField}
          <label>
            Deal type
            <select name="type" defaultValue="new_client">
              {DEAL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DEAL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Deal title
            <input name="title" required placeholder="New SKU introduction" />
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
            <textarea name="comment" rows={2} placeholder="Additional context (optional)" />
          </label>
          {processState && !processState.ok ? <p className="error">{processState.error}</p> : null}
          <div className="stage-controls">
            <button type="submit" className="btn btn--primary" disabled={processPending}>
              {processPending ? "Saving…" : "Create deal"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {tab === "shipment" ? (
        <form action={shipAction} className="form">
          {clientField}
          <ProductLines products={products} />
          <label>
            Shipment date
            <input name="scheduledDate" type="date" required />
          </label>
          {shipState && !shipState.ok ? <p className="error">{shipState.error}</p> : null}
          <div className="stage-controls">
            <button type="submit" className="btn btn--primary" disabled={shipPending}>
              {shipPending ? "Creating…" : "Create shipment"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {tab === "additional" ? (
        <form action={addAction} className="form">
          {clientField}
          <label>
            Parent order #
            <input name="parentOrderNumber" required placeholder="ORD-123456" />
          </label>
          <ProductLines products={products} />
          <label>
            Shipment date
            <input name="scheduledDate" type="date" required />
          </label>
          <label>
            Note
            <textarea name="note" rows={2} placeholder="Optional" />
          </label>
          {addState && !addState.ok ? <p className="error">{addState.error}</p> : null}
          <div className="stage-controls">
            <button type="submit" className="btn btn--primary" disabled={addPending}>
              {addPending ? "Creating…" : "Create add-on request"}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </ModalOverlay>
  );
}
