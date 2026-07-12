"use client";

import type { ConversationHitDto, ConversationSummaryDto } from "../actions";

/** Localized conversation date: "Jun 27, 2:32 PM" (no year — the list is recent). */
function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const cardBase = {
  display: "block",
  width: "100%",
  textAlign: "left" as const,
  border: "1px solid rgba(255,255,255,0.6)",
  borderRadius: 14,
  padding: "10px 12px",
  cursor: "pointer",
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

interface HistoryPanelProps {
  readonly conversations: readonly ConversationSummaryDto[];
  readonly searchHits: readonly ConversationHitDto[] | null;
  readonly query: string;
  readonly activeId: string | null;
  readonly loading: boolean;
  readonly onQueryChange: (value: string) => void;
  readonly onSelect: (id: string) => void;
  readonly onNew: () => void;
}

/**
 * Assistant "History" sidebar: search across messages, a "New conversation" button, and
 * the owner's list of conversations (newest first). With a non-empty search it shows
 * matching conversations with a snippet; an empty query → the regular list. RBAC is
 * enforced server-side (by ownerId).
 */
export function AssistantHistoryPanel({
  conversations,
  searchHits,
  query,
  activeId,
  loading,
  onQueryChange,
  onSelect,
  onNew,
}: HistoryPanelProps) {
  const searching = query.trim() !== "";

  return (
    <aside
      style={{
        width: 264,
        maxWidth: "100%",
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
      aria-label="Conversation history"
    >
      <button
        type="button"
        onClick={onNew}
        style={{
          ...cardBase,
          textAlign: "center",
          font: "700 13px Arial",
          color: "#fff",
          background: "#bf322b",
          border: "none",
        }}
      >
        + New conversation
      </button>

      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search history…"
        aria-label="Search history"
        style={{
          font: "400 13px Arial",
          color: "#16181d",
          border: "1px solid rgba(255,255,255,0.65)",
          borderRadius: 12,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.55)",
          outline: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          overflowY: "auto",
          maxHeight: "60vh",
        }}
      >
        {searching ? (
          searchHits && searchHits.length > 0 ? (
            searchHits.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => onSelect(hit.id)}
                aria-pressed={hit.id === activeId}
                style={{
                  ...cardBase,
                  ...(hit.id === activeId ? { border: "1px solid #bf322b" } : {}),
                }}
              >
                <span style={{ display: "block", font: "700 12px Arial", color: "#16181d" }}>
                  {hit.title}
                </span>
                <span
                  style={{
                    display: "block",
                    font: "400 11px Arial",
                    color: "#6b6f78",
                    marginTop: 3,
                  }}
                >
                  {hit.snippet}
                </span>
                <span
                  style={{
                    display: "block",
                    font: "400 10px Arial",
                    color: "#9a9ea8",
                    marginTop: 3,
                  }}
                >
                  {formatWhen(hit.updatedAt)}
                </span>
              </button>
            ))
          ) : (
            <p style={{ font: "400 12px Arial", color: "#9a9ea8", margin: "4px 2px" }}>
              {loading ? "Searching…" : "Nothing found."}
            </p>
          )
        ) : conversations.length > 0 ? (
          conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelect(conv.id)}
              aria-pressed={conv.id === activeId}
              style={{
                ...cardBase,
                ...(conv.id === activeId ? { border: "1px solid #bf322b" } : {}),
              }}
            >
              <span style={{ display: "block", font: "700 12px Arial", color: "#16181d" }}>
                {conv.title}
              </span>
              {conv.preview ? (
                <span
                  style={{
                    display: "block",
                    font: "400 11px Arial",
                    color: "#6b6f78",
                    marginTop: 3,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {conv.preview}
                </span>
              ) : null}
              <span
                style={{
                  display: "block",
                  font: "400 10px Arial",
                  color: "#9a9ea8",
                  marginTop: 3,
                }}
              >
                {formatWhen(conv.updatedAt)}
              </span>
            </button>
          ))
        ) : (
          <p style={{ font: "400 12px Arial", color: "#9a9ea8", margin: "4px 2px" }}>
            {loading ? "Loading…" : "No saved conversations yet."}
          </p>
        )}
      </div>
    </aside>
  );
}
