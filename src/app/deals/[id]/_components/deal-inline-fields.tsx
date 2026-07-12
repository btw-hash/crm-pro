"use client";

import { DEAL_GOAL_LABELS, DEAL_GOALS, DEFAULT_DEAL_GOAL } from "@/domain/deal/deal-goal";
import type { InlineDealField } from "../actions";
import { inlineUpdateDealAction } from "../actions";
import { InlineEditField, InlineEditSelect, type InlineSaveResult } from "./inline-edit";

interface ManagerOption {
  readonly id: string;
  readonly name: string;
}

interface DealInlineFieldsProps {
  readonly dealId: string;
  readonly title: string;
  readonly goal: string;
  readonly responsibleManagerId: string;
  readonly managers: readonly ManagerOption[];
  /** RBAC: a sales rep can only edit their own deals; otherwise fields show as plain text. */
  readonly canEdit: boolean;
}

const GOAL_OPTIONS = DEAL_GOALS.map((g) => ({ value: g, label: DEAL_GOAL_LABELS[g] }));

/**
 * Inline-editable fields of the deal "Overview" (REQ-5/#158): title, goal,
 * owner. Click a value → input/select, Enter saves, Esc cancels — no
 * "Edit" form. Each field calls `inlineUpdateDealAction` (owner RBAC
 * on the server), optimistically, with rollback on error.
 */
export function DealInlineFields({
  dealId,
  title,
  goal,
  responsibleManagerId,
  managers,
  canEdit,
}: DealInlineFieldsProps) {
  const save =
    (field: InlineDealField) =>
    (value: string): Promise<InlineSaveResult> =>
      inlineUpdateDealAction({ dealId, field, value });

  return (
    <div className="inline-edit-group">
      <InlineEditField label="Title" value={title} onSave={save("title")} readOnly={!canEdit} />
      <InlineEditSelect
        label="Goal"
        value={goal || DEFAULT_DEAL_GOAL}
        options={GOAL_OPTIONS}
        onSave={save("goal")}
        readOnly={!canEdit}
      />
      <InlineEditSelect
        label="Owner"
        value={responsibleManagerId}
        options={managers.map((m) => ({ value: m.id, label: m.name }))}
        onSave={save("responsibleManagerId")}
        readOnly={!canEdit}
      />
    </div>
  );
}
