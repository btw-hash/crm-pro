import type { Id } from "@/domain/shared/id";

/** Identifier of a saved conversation with the head's assistant. */
export type AssistantConversationId = Id<"AssistantConversationId">;

/** Identifier of a single message within a conversation. */
export type AssistantMessageId = Id<"AssistantMessageId">;

/** Role of the message author: the head's question or the assistant's answer. */
export type AssistantMessageRole = "user" | "assistant";

/**
 * Source of the assistant's answer (as in `ManagerAssistantAnswer.source`): CRM
 * data, an external web search, or a mix of both. Stored on answer messages for
 * transparency about "where the answer came from"; not set on user questions.
 */
export type AssistantMessageKind = "crm" | "web" | "mixed";

/**
 * A saved conversation with the head's assistant. Tied to an owner (`ownerId` —
 * the user's id): history is private, other users' conversations are
 * inaccessible (owner-based RBAC). A pure domain — no infra/Next imports.
 */
export interface AssistantConversation {
  readonly id: AssistantConversationId;
  readonly ownerId: string;
  readonly title: string;
  readonly createdAt: string; // ISO
  readonly updatedAt: string; // ISO — refreshed on every new message
}

/**
 * A clickable web source found by the assistant (title + URL). Stored on
 * answer messages so the links don't disappear when reopening a conversation
 * from history (#15).
 */
export interface AssistantMessageWebResult {
  readonly title: string;
  readonly url: string;
}

/** A single message in a conversation: the head's question or the assistant's answer. */
export interface AssistantMessage {
  readonly id: AssistantMessageId;
  readonly conversationId: AssistantConversationId;
  readonly role: AssistantMessageRole;
  readonly text: string;
  /** Source of the assistant's answer (role="assistant" only); absent on questions. */
  readonly kind?: AssistantMessageKind;
  /** Web sources found for the answer (role="assistant" with web search); otherwise absent. */
  readonly webResults?: readonly AssistantMessageWebResult[];
  readonly createdAt: string; // ISO
}

/** A conversation summary for the "History" list (no full text — preview only). */
export interface ConversationSummary {
  readonly id: AssistantConversationId;
  readonly title: string;
  readonly updatedAt: string; // ISO
  /** Preview of the conversation's last message (empty if there are no messages). */
  readonly preview: string;
}

/** A conversation found in search results: a summary + a snippet matching the query. */
export interface ConversationSearchHit {
  readonly id: AssistantConversationId;
  readonly title: string;
  readonly updatedAt: string; // ISO
  /** A fragment of the message around the match with the search query. */
  readonly snippet: string;
}

/** Max length of a conversation title (generated from the first question). */
export const CONVERSATION_TITLE_MAX_LENGTH = 60;

/**
 * Derives a conversation title from the first question: the first line, up to
 * ~60 characters, trimmed at a word boundary (so a word isn't cut in the
 * middle) with an ellipsis. An empty/blank question falls back to "Untitled".
 */
export function deriveConversationTitle(question: string): string {
  const firstLine = question.trim().split("\n")[0]?.trim() ?? "";
  if (firstLine === "") {
    return "Untitled";
  }
  if (firstLine.length <= CONVERSATION_TITLE_MAX_LENGTH) {
    return firstLine;
  }
  const head = firstLine.slice(0, CONVERSATION_TITLE_MAX_LENGTH);
  const lastSpace = head.lastIndexOf(" ");
  // If there's a space within the window, cut there; otherwise take the whole window (one long word).
  const trimmed = lastSpace > 0 ? head.slice(0, lastSpace) : head;
  return `${trimmed.trimEnd()}…`;
}

/**
 * A snippet around the first occurrence of `query` in `text` (case-insensitive).
 * Takes a window of `radius` characters before/after the match with ellipses at
 * the edges. If there's no match (or the query is empty) — returns the start of
 * the text. Used to highlight matches in search.
 */
export function buildSnippet(text: string, query: string, radius = 40): string {
  const trimmedQuery = query.trim();
  const flat = text.replace(/\s+/g, " ").trim();
  if (trimmedQuery === "") {
    return flat.length <= radius * 2 ? flat : `${flat.slice(0, radius * 2)}…`;
  }
  const at = flat.toLowerCase().indexOf(trimmedQuery.toLowerCase());
  if (at < 0) {
    return flat.length <= radius * 2 ? flat : `${flat.slice(0, radius * 2)}…`;
  }
  const start = Math.max(0, at - radius);
  const end = Math.min(flat.length, at + trimmedQuery.length + radius);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < flat.length ? "…" : "";
  return `${prefix}${flat.slice(start, end)}${suffix}`;
}
