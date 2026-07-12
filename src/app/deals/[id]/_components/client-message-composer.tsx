"use client";

import { useState } from "react";
import { draftClientMessageAction } from "../actions";

interface Message {
  subject: string;
  body: string;
}

/**
 * AI draft of a client email based on the deal context. The manager can optionally set
 * an intent → AI writes the subject and body → the manager edits and COPIES it (sends it
 * themselves; there is no auto-send — that's a human action). AI does not invent facts.
 */
export function ClientMessageComposer({ dealId }: { dealId: string }) {
  const [intent, setIntent] = useState("");
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const result = await draftClientMessageAction(dealId, intent);
      if (result.ok) {
        setMessage({ subject: result.subject, body: result.body });
      } else {
        setError(result.error);
      }
    } catch {
      setError("Failed to reach the AI. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(`Subject: ${message.subject}\n\n${message.body}`);
      setCopied(true);
    } catch {
      setError("Couldn't copy automatically — select and copy the text manually.");
    }
  }

  // Any text edit invalidates "Copied ✓" — otherwise the clipboard would still hold the
  // old version while the indicator falsely claims the edited text was copied.
  function edit(patch: Partial<Message>) {
    if (!message) return;
    setMessage({ ...message, ...patch });
    setCopied(false);
  }

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.5)",
        border: "1px solid #e8e1d9",
        borderRadius: 14,
        padding: 14,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            background: "#1c1f27",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flex: "none",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </span>
        <span style={{ font: "600 13px Arial" }}>Client email — AI draft</span>
        <span
          style={{
            marginLeft: "auto",
            font: "600 10px Arial",
            color: "#6a5f54",
            background: "#efe9e2",
            borderRadius: 999,
            padding: "4px 10px",
          }}
        >
          no auto-send
        </span>
      </div>

      <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>
        What the email is about (optional)
      </div>
      <input
        value={intent}
        onChange={(event) => setIntent(event.target.value)}
        placeholder="E.g.: follow up on the proposal, thank them for the test"
        style={{
          width: "100%",
          boxSizing: "border-box",
          border: "1px solid #e8e1d9",
          borderRadius: 10,
          padding: "9px 11px",
          font: "400 13px Arial",
          background: "#fff",
          color: "#16181d",
          outline: "none",
          marginBottom: 11,
        }}
      />

      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading}
        style={{
          border: "none",
          background: "#1c1f27",
          color: "#fff",
          font: "600 13px Arial",
          padding: "9px 16px",
          borderRadius: 999,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "AI is writing…" : "Generate email (AI)"}
      </button>

      {error ? <p className="error">{error}</p> : null}

      {message ? (
        <div style={{ marginTop: 11 }}>
          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>Subject</div>
          <input
            value={message.subject}
            onChange={(event) => edit({ subject: event.target.value })}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #e8e1d9",
              borderRadius: 10,
              padding: "9px 11px",
              font: "600 13px Arial",
              background: "#fff",
              color: "#16181d",
              outline: "none",
              marginBottom: 10,
            }}
          />

          <div style={{ font: "400 11px Arial", color: "#9a9ea8", marginBottom: 5 }}>Body</div>
          <textarea
            rows={8}
            value={message.body}
            onChange={(event) => edit({ body: event.target.value })}
            style={{
              width: "100%",
              boxSizing: "border-box",
              border: "1px solid #e8e1d9",
              borderRadius: 10,
              padding: "10px 11px",
              font: "400 13px/1.5 Arial",
              background: "#fff",
              color: "#16181d",
              outline: "none",
              resize: "vertical",
              marginBottom: 11,
            }}
          />

          <div style={{ font: "400 12px Arial", color: "#6b6f78", marginBottom: 11 }}>
            Review and edit if needed — send it to the client yourself (there is no auto-send).
          </div>

          <button
            type="button"
            onClick={() => void copy()}
            style={{
              border: "1px solid #e8e1d9",
              background: "#fff",
              color: "#16181d",
              font: "600 13px Arial",
              padding: "9px 16px",
              borderRadius: 999,
              cursor: "pointer",
            }}
          >
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
