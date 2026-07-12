"use client";

import { useEffect, useRef, useState } from "react";

/** Result of saving an inline field. A rejection rolls back the optimistic value. */
export type InlineSaveResult = { ok: true } | { ok: false; error: string };

interface InlineEditBaseProps {
  /** Field label (shown before the value). */
  readonly label: string;
  /** Current (original) value. */
  readonly value: string;
  /** Saves the new value. Returns ok | error for rollback. */
  readonly onSave: (next: string) => Promise<InlineSaveResult>;
  /** Cannot be edited — the field is shown as static text (RBAC). */
  readonly readOnly?: boolean;
}

/**
 * Optimistic inline editing: a shared hook for the text and select variants.
 * Clicking a value → edit mode; saving applies the value immediately
 * (optimistically), and on error rolls back to the original and shows the error text.
 */
function useInlineEdit(value: string, onSave: (next: string) => Promise<InlineSaveResult>) {
  const [editing, setEditing] = useState(false);
  // The optimistically displayed value (until the server confirms/rolls back).
  const [shown, setShown] = useState(value);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The server revalidated the page with a new value — sync up
  // (but don't overwrite what the user is currently editing).
  useEffect(() => {
    if (!editing && !pending) {
      setShown(value);
    }
  }, [value, editing, pending]);

  function begin(): void {
    if (pending) return;
    setDraft(shown);
    setError(null);
    setEditing(true);
  }

  function cancel(): void {
    setEditing(false);
    setError(null);
    setDraft(shown);
  }

  async function commit(next: string): Promise<void> {
    setEditing(false);
    if (next === shown) {
      return; // no change — send nothing
    }
    const previous = shown;
    setShown(next); // optimistic
    setPending(true);
    setError(null);
    const result = await onSave(next);
    setPending(false);
    if (!result.ok) {
      setShown(previous); // rollback
      setError(result.error);
    }
  }

  return { editing, shown, draft, setDraft, error, pending, begin, cancel, commit };
}

/** Inline editing of a text field: click → input, Enter saves, Esc cancels. */
export function InlineEditField({ label, value, onSave, readOnly }: InlineEditBaseProps) {
  const inline = useInlineEdit(value, onSave);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inline.editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [inline.editing]);

  return (
    <div className="inline-edit">
      <span className="inline-edit__label">{label}</span>
      {inline.editing && !readOnly ? (
        <input
          ref={inputRef}
          className="inline-edit__input"
          value={inline.draft}
          aria-label={label}
          disabled={inline.pending}
          onChange={(e) => inline.setDraft(e.target.value)}
          onBlur={() => void inline.commit(inline.draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void inline.commit(inline.draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              inline.cancel();
            }
          }}
        />
      ) : (
        <button
          type="button"
          className="inline-edit__value"
          disabled={readOnly || inline.pending}
          onClick={inline.begin}
          title={readOnly ? undefined : "Click to edit"}
        >
          {inline.shown || "—"}
        </button>
      )}
      {inline.error ? <span className="inline-edit__error">{inline.error}</span> : null}
    </div>
  );
}

interface InlineEditSelectProps extends InlineEditBaseProps {
  /** Selectable options: value + label. */
  readonly options: readonly { readonly value: string; readonly label: string }[];
}

/** Inline editing of a select field: click → select, Enter saves, Esc cancels. */
export function InlineEditSelect({
  label,
  value,
  onSave,
  options,
  readOnly,
}: InlineEditSelectProps) {
  const inline = useInlineEdit(value, onSave);
  const selectRef = useRef<HTMLSelectElement>(null);

  useEffect(() => {
    if (inline.editing) {
      selectRef.current?.focus();
    }
  }, [inline.editing]);

  const labelOf = (v: string): string => options.find((o) => o.value === v)?.label ?? v;

  return (
    <div className="inline-edit">
      <span className="inline-edit__label">{label}</span>
      {inline.editing && !readOnly ? (
        <select
          ref={selectRef}
          className="inline-edit__input"
          value={inline.draft}
          aria-label={label}
          disabled={inline.pending}
          onChange={(e) => inline.setDraft(e.target.value)}
          onBlur={() => void inline.commit(inline.draft)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void inline.commit(inline.draft);
            } else if (e.key === "Escape") {
              e.preventDefault();
              inline.cancel();
            }
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <button
          type="button"
          className="inline-edit__value"
          disabled={readOnly || inline.pending}
          onClick={inline.begin}
          title={readOnly ? undefined : "Click to edit"}
        >
          {labelOf(inline.shown) || "—"}
        </button>
      )}
      {inline.error ? <span className="inline-edit__error">{inline.error}</span> : null}
    </div>
  );
}
