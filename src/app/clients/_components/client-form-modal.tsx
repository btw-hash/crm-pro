"use client";

import { useActionState, useEffect } from "react";
import { ModalOverlay } from "@/app/_components/modal-overlay";
import { CLIENT_CATEGORIES } from "@/domain/client/client-category";
import { CLIENT_TYPES, CLIENT_TYPE_LABELS } from "@/domain/client/client-type";
import type { Client } from "@/domain/client/client";
import {
  createClientAction,
  updateClientAction,
  type CreateClientResult,
  type UpdateClientResult,
} from "../actions";

const CATEGORY_LABELS: Record<string, string> = {
  A: "High (A)",
  B: "Medium (B)",
  C: "Low (C)",
};

interface CreateMode {
  readonly mode: "create";
  readonly onCreated?: (clientId: string) => void;
}

interface EditMode {
  readonly mode: "edit";
  readonly client: Client;
  readonly onUpdated?: () => void;
}

type ClientFormModalProps = (CreateMode | EditMode) & {
  readonly onClose: () => void;
};

const CREATE_INITIAL: CreateClientResult | null = null;
const UPDATE_INITIAL: UpdateClientResult | null = null;

function CreateForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState(createClientAction, CREATE_INITIAL);

  useEffect(() => {
    if (state?.ok) {
      onCreated?.(state.clientId);
      onClose();
    }
  }, [state, onClose, onCreated]);

  return (
    <form action={formAction} className="form">
      <label>
        Name <span style={{ color: "var(--accent)" }}>*</span>
        <input name="name" required placeholder="Amber Bakery" autoFocus />
      </label>
      <label>
        Client type
        <select name="type" defaultValue="retail">
          {CLIENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CLIENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Priority
        <select name="category" defaultValue="C">
          {CLIENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
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
  );
}

function EditForm({
  client,
  onClose,
  onUpdated,
}: {
  client: Client;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [state, formAction, pending] = useActionState(updateClientAction, UPDATE_INITIAL);

  useEffect(() => {
    if (state?.ok) {
      onUpdated?.();
      onClose();
    }
  }, [state, onClose, onUpdated]);

  return (
    <form action={formAction} className="form">
      <input type="hidden" name="id" value={client.id} />
      <input type="hidden" name="responsibleManagerId" value={client.responsibleManagerId} />
      <label>
        Name <span style={{ color: "var(--accent)" }}>*</span>
        <input name="name" required defaultValue={client.name} autoFocus />
      </label>
      <label>
        Client type
        <select name="type" defaultValue={client.type}>
          {CLIENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {CLIENT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Priority
        <select name="category" defaultValue={client.category}>
          {CLIENT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label>
        City
        <input name="city" placeholder="Portland" defaultValue={client.city ?? ""} />
      </label>
      <label>
        EIN
        <input name="ein" placeholder="12-3456789" maxLength={12} defaultValue={client.ein ?? ""} />
      </label>
      {state && !state.ok ? <p className="error">{state.error}</p> : null}
      <div className="stage-controls">
        <button type="submit" className="btn btn--primary" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function ClientFormModal(props: ClientFormModalProps) {
  const title = props.mode === "create" ? "New client" : "Edit client";
  return (
    <ModalOverlay ariaLabel={title} onClose={props.onClose}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>{title}</h3>
      {props.mode === "create" ? (
        <CreateForm onClose={props.onClose} onCreated={props.onCreated} />
      ) : (
        <EditForm client={props.client} onClose={props.onClose} onUpdated={props.onUpdated} />
      )}
    </ModalOverlay>
  );
}
