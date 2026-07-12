"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityDraft } from "@/application/ports/ai-gateway";
import { draftActivityFromVoiceAction, recordVoiceActivityAction } from "../actions";
import { useServerRecorder } from "./use-server-recorder";

const KIND_OPTIONS = [
  { value: "call", label: "Call" },
  { value: "visit", label: "Visit" },
  { value: "note", label: "Note" },
];

/**
 * Voice→activity: the manager dictates a summary of a call/meeting → server-side
 * compliant STT → AI breaks it down into type/gist/next step → a human confirms →
 * it's recorded in the timeline (+ optional next-step task). Reuses the recorder from #83.
 */
export function VoiceActivityComposer({ dealId, clientId }: { dealId: string; clientId: string }) {
  const router = useRouter();
  const [transcript, setTranscript] = useState("");
  const [draft, setDraft] = useState<ActivityDraft | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { recording, busy, error, start, stop } = useServerRecorder((text) =>
    setTranscript((prev) => (prev.trim() ? `${prev} ${text}` : text)),
  );

  async function handleParse() {
    if (!transcript.trim()) return;
    setParsing(true);
    try {
      setDraft(await draftActivityFromVoiceAction(transcript));
    } finally {
      setParsing(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await recordVoiceActivityAction(new FormData(event.currentTarget));
      setDraft(null);
      setTranscript("");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  if (draft) {
    return (
      <form onSubmit={handleSave} className="form">
        <input type="hidden" name="dealId" value={dealId} />
        <input type="hidden" name="clientId" value={clientId} />
        <p className="muted">The AI recognized a task from the transcript. Review and confirm.</p>
        <label>
          Type
          <select name="kind" defaultValue={draft.kind === "task" ? "note" : draft.kind}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Content
          {/* required: if the AI returned empty text, the browser won't submit an empty
              form — otherwise the action would silently not save, and the composer would
              falsely reset as "successful". */}
          <textarea name="text" rows={3} defaultValue={draft.text} required />
        </label>
        <label>
          Next step (task) — optional
          <input
            name="nextStepText"
            defaultValue={draft.nextStepText ?? ""}
            placeholder="E.g.: call back about the price"
          />
        </label>
        <label>
          Next-step deadline
          {/* AI draft: the day is resolved by code from "tomorrow"/"on Friday"
              (resolveRelativeDueDate), the time is in the step text. A human reviews and
              edits as needed. */}
          <input type="date" name="nextStepDueDate" defaultValue={draft.nextStepDueDate ?? ""} />
        </label>
        <div className="stage-controls">
          <button type="submit" className="btn" disabled={saving}>
            {saving ? "Saving…" : "Confirm and save"}
          </button>
          <button type="button" className="btn" onClick={() => setDraft(null)} disabled={saving}>
            ← Back
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="form">
      <label>
        By voice: call / meeting summary
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={2}
          placeholder="Press “Record” and dictate the summary, or type the text"
        />
      </label>
      <p className="muted">
        {recording
          ? "🎤 Recording — “Stop and transcribe”."
          : busy
            ? "Transcribing on the server (compliant data residency)…"
            : "Recording → server-side Whisper (compliant data residency), not Google. AI will break it down into type/gist/next step."}
      </p>
      {error ? <p className="error">{error}</p> : null}
      <div className="stage-controls">
        {recording ? (
          <button type="button" className="btn" onClick={() => void stop()}>
            ■ Stop and transcribe
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => void start()} disabled={busy}>
            🎤 Record
          </button>
        )}
        <button
          type="button"
          className="btn"
          onClick={() => void handleParse()}
          disabled={parsing || recording || busy || !transcript.trim()}
        >
          {parsing ? "AI is transcribing…" : "AI recognize → task"}
        </button>
      </div>
    </div>
  );
}
