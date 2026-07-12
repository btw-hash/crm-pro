"use client";

import { useActionState, useEffect, useState } from "react";
import { DEAL_GOAL_LABELS, DEAL_GOALS, type DealGoal } from "@/domain/deal/deal-goal";
import type { DealMutationResult } from "../../actions";
import { deleteDealAction, updateDealAction } from "../../actions";

interface ClientOption {
  readonly id: string;
  readonly name: string;
}

interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

interface DealCrudControlsProps {
  readonly dealId: string;
  readonly dealTitle: string;
  readonly clientId: string;
  readonly responsibleManagerId: string;
  readonly goal: DealGoal | undefined;
  readonly comment: string | undefined;
  readonly clients: readonly ClientOption[];
  readonly managers: readonly ManagerOption[];
  readonly canEdit: boolean;
}

const INITIAL: DealMutationResult | null = null;

export function DealCrudControls({
  dealId,
  dealTitle,
  clientId,
  responsibleManagerId,
  goal,
  comment,
  clients,
  managers,
  canEdit,
}: DealCrudControlsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [updateState, updateAction, updatePending] = useActionState(updateDealAction, INITIAL);

  useEffect(() => {
    if (updateState?.ok) {
      setEditOpen(false);
    }
  }, [updateState]);

  if (!canEdit) return null;

  return (
    <>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
        <button type="button" className="btn" onClick={() => setEditOpen(true)}>
          Edit
        </button>
        <button type="button" className="btn btn--revert" onClick={() => setDeleteOpen(true)}>
          Delete process
        </button>
      </div>

      {editOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit process"
          onClick={() => setEditOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,32,45,0.5)",
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "1.4rem 1.6rem",
              width: "100%",
              maxWidth: 480,
              boxShadow: "0 12px 48px rgba(20,40,60,0.28)",
            }}
          >
            <h3 style={{ margin: "0 0 1rem", fontSize: "1.05rem" }}>Edit process</h3>
            <form action={updateAction} className="form">
              <input type="hidden" name="dealId" value={dealId} />
              <label>
                Client
                <select name="clientId" defaultValue={clientId}>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Process name
                <input name="title" required defaultValue={dealTitle} />
              </label>
              <label>
                Goal
                <select name="goal" defaultValue={goal ?? "other"}>
                  {DEAL_GOALS.map((g) => (
                    <option key={g} value={g}>
                      {DEAL_GOAL_LABELS[g]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Owner
                <select name="responsibleManagerId" defaultValue={responsibleManagerId}>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Comment
                <textarea name="comment" rows={2} defaultValue={comment ?? ""} />
              </label>
              {updateState && !updateState.ok ? <p className="error">{updateState.error}</p> : null}
              <div className="stage-controls">
                <button type="submit" className="btn btn--primary" disabled={updatePending}>
                  {updatePending ? "Saving…" : "Save"}
                </button>
                <button type="button" className="btn" onClick={() => setEditOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deleteOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Delete process"
          onClick={() => setDeleteOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(20,32,45,0.5)",
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "1.4rem 1.6rem",
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 12px 48px rgba(20,40,60,0.28)",
            }}
          >
            <h3 style={{ margin: "0 0 0.9rem", fontSize: "1.05rem" }}>
              Delete process "{dealTitle}"?
            </h3>
            <p style={{ margin: "0 0 1.2rem", color: "var(--muted)" }}>
              This action cannot be undone.
            </p>
            <div className="stage-controls">
              <form action={deleteDealAction.bind(null, dealId)}>
                <button type="submit" className="btn btn--revert">
                  Delete
                </button>
              </form>
              <button type="button" className="btn" onClick={() => setDeleteOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
