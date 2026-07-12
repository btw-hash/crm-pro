"use client";

import { useState } from "react";
import { recordActivityAction, suggestNextStepAction } from "../actions";

/**
 * AI "next step" advisor: shown for a stalled deal (no open task). Button → AI
 * suggests an action based on the stage/history → the human edits → saves it as
 * a task (reuses recordActivity, kind=task). After saving, the deal has a
 * next step and the advisor disappears.
 */
export function NextStepAdvisor({ dealId, clientId }: { dealId: string; clientId: string }) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function suggest() {
    setLoading(true);
    setError(null);
    try {
      const result = await suggestNextStepAction(dealId);
      if (result.ok) {
        setSuggestion(result.suggestion);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to reach the AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (suggestion) {
    return (
      <form action={recordActivityAction} className="form">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="clientId" value={clientId} />
        <input type="hidden" name="kind" value="task" />
        <p className="muted">AI suggests a next step. Review it, set a due date, and save.</p>
        <label>
          Next step
          <textarea name="text" rows={2} defaultValue={suggestion} required />
        </label>
        <label>
          Due date
          <input type="date" name="dueDate" />
        </label>
        <div className="stage-controls">
          <button type="submit" className="btn">
            Save as task
          </button>
          <button type="button" className="btn" onClick={() => setSuggestion(null)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div>
      {error ? <p className="error">{error}</p> : null}
      <button type="button" className="btn" onClick={() => void suggest()} disabled={loading}>
        {loading ? "AI is thinking…" : "🤖 Suggest next step (AI)"}
      </button>
    </div>
  );
}
