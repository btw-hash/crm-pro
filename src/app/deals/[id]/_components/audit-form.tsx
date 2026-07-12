"use client";

import { useActionState } from "react";
import { saveAuditAction, updateAuditAction } from "../actions";
import type { ProductionAudit } from "@/domain/audit/production-audit";

/**
 * Production audit form. Works in two modes:
 * - create (existing=undefined): creates a new audit.
 * - edit (existing=ProductionAudit): edits an existing one.
 * Domain rejections arrive as a serializable result and are shown inline.
 */
export function AuditForm({
  dealId,
  clientId,
  existing,
}: {
  dealId: string;
  clientId: string;
  existing?: ProductionAudit;
}) {
  const [createState, createAction, createPending] = useActionState(saveAuditAction, null);
  const [updateState, updateAction, updatePending] = useActionState(updateAuditAction, null);

  const isEdit = existing !== undefined;
  const state = isEdit ? updateState : createState;
  const action = isEdit ? updateAction : createAction;
  const pending = isEdit ? updatePending : createPending;

  return (
    <form action={action} className="form">
      <input type="hidden" name="dealId" value={dealId} />
      <input type="hidden" name="clientId" value={clientId} />
      {isEdit ? <input type="hidden" name="auditId" value={existing.id} /> : null}
      <label>
        Equipment (one per line)
        <textarea
          name="equipment"
          rows={2}
          placeholder="Miwe rotary oven"
          defaultValue={existing?.equipment.join("\n") ?? ""}
        />
      </label>
      <label>
        Client pain points (one per line)
        <textarea
          name="painPoints"
          rows={2}
          placeholder="Filling leaks onto the trays"
          defaultValue={existing?.painPoints.join("\n") ?? ""}
        />
      </label>
      {state && !state.ok ? <p className="error">{state.error}</p> : null}
      <button type="submit" className="btn" disabled={pending}>
        {pending ? (isEdit ? "Saving…" : "Saving…") : isEdit ? "Save changes" : "Save audit"}
      </button>
    </form>
  );
}
