"use client";

import { useState } from "react";
import type { TestActDraft } from "@/application/ports/ai-gateway";
import { draftActFromVoiceAction, recordActAction } from "../actions";
import { useServerRecorder } from "./use-server-recorder";

// Demo transcript sample (per the spec): the technologist dictated a report after a test.
const SAMPLE =
  "So, this is for Sweet World Confections. We ran a croissant bake today on the Miwe oven. We used " +
  "Carat Cover glaze, dosage 12% of the mass. Mixing time was 8 minutes, baked at 180 degrees " +
  "for exactly 15 minutes. The dough didn't tear, the glaze didn't boil over or leak onto the " +
  "trays. The technologist, Marina, was happy and signed off on the act.";

const FIELD_LABELS: Record<string, string> = {
  clientName: "Client",
  productName: "Product",
  dosage: "Dosage",
  processParams: "Process parameters",
  result: "Result",
};

export function VoiceActComposer({ dealId }: { dealId: string }) {
  const [transcript, setTranscript] = useState(SAMPLE);
  const [draft, setDraft] = useState<TestActDraft | null>(null);
  const [pending, setPending] = useState(false);
  const { recording, busy, error, start, stop } = useServerRecorder((text) =>
    setTranscript((prev) => (prev.trim() ? `${prev} ${text}` : text)),
  );

  async function handleParse() {
    setPending(true);
    try {
      setDraft(await draftActFromVoiceAction(transcript));
    } finally {
      setPending(false);
    }
  }

  if (draft) {
    return (
      <form action={recordActAction} className="form">
        <input type="hidden" name="dealId" value={dealId} />
        {draft.missingFields.length > 0 ? (
          <p className="error">
            The AI is unsure about these fields:{" "}
            {draft.missingFields.map((field) => FIELD_LABELS[field] ?? field).join(", ")}. Review
            and fill them in before saving.
          </p>
        ) : (
          <p className="muted">The AI recognized a draft. Review the fields and confirm.</p>
        )}
        <label>
          Client
          <input name="clientName" defaultValue={draft.clientName ?? ""} />
        </label>
        <label>
          Equipment
          <input name="equipment" defaultValue={draft.equipment ?? ""} />
        </label>
        <label>
          Product
          <input name="productName" defaultValue={draft.productName ?? ""} />
        </label>
        <label>
          Dosage
          <input name="dosage" defaultValue={draft.dosage ?? ""} />
        </label>
        <label>
          Process parameters
          <input name="processParams" defaultValue={draft.processParams ?? ""} />
        </label>
        <label>
          Result
          <select name="result" defaultValue={draft.result === "failure" ? "failure" : "success"}>
            <option value="success">Successful</option>
            <option value="failure">Unsuccessful</option>
          </select>
        </label>
        <label>
          Comment
          <textarea name="comment" rows={2} defaultValue={draft.comment ?? ""} />
        </label>
        <div className="stage-controls">
          <button type="submit" className="btn">
            Confirm and save
          </button>
          <button type="button" className="btn" onClick={() => setDraft(null)}>
            ← Back to transcript
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="form">
      <label>
        Voice report transcript
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={4}
        />
      </label>
      <p className="muted">
        {recording
          ? "🎤 Recording — press “Stop and transcribe”."
          : busy
            ? "Transcribing on the server (Whisper, compliant data residency)…"
            : "Press “Record” and dictate the report, or type/paste the text. " +
              "Transcription runs on our server (compliant data residency), not through Google."}
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
          onClick={() => setTranscript("")}
          disabled={recording || busy}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn"
          onClick={handleParse}
          disabled={pending || recording || busy}
        >
          {pending ? "AI is transcribing…" : "AI recognize → act draft"}
        </button>
      </div>
    </div>
  );
}
