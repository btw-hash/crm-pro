import type {
  AssistantConversationRepository,
  AssistantConversationWithMessages,
} from "@/application/ports/assistant-conversation-repository";
import type { WebSearchResult } from "@/application/ports/web-search-gateway";
import {
  deriveConversationTitle,
  type AssistantConversationId,
  type AssistantMessageKind,
  type ConversationSearchHit,
  type ConversationSummary,
} from "@/domain/assistant/conversation";

/** Input for recording one assistant "question -> answer" exchange in history. */
export interface RecordAssistantExchangeInput {
  readonly ownerId: string;
  /** null -> create a new conversation; otherwise append to the existing one. */
  readonly conversationId: AssistantConversationId | null;
  readonly question: string;
  readonly answer: string;
  /** Source of the assistant's answer (crm/web/mixed). */
  readonly kind: AssistantMessageKind;
  /** Web sources found (if a web search was performed) — for future UI rendering. */
  readonly webResults?: readonly WebSearchResult[];
}

export type RecordAssistantExchange = (
  input: RecordAssistantExchangeInput,
) => Promise<{ conversationId: AssistantConversationId }>;

/**
 * Saves one assistant exchange (user question + answer) into history. If
 * `conversationId` is empty — starts a new conversation (title derived from the
 * first question) and writes both messages; otherwise appends them to the
 * existing conversation. Scoped to `ownerId` (owner-based RBAC). Web sources
 * (`webResults`) are saved as a separate field on the answer (not in the text)
 * so that clickable links are restored when reopening the conversation from
 * history (#15). The UI renders them as a separate list.
 */
export function makeRecordAssistantExchange(deps: {
  conversations: AssistantConversationRepository;
}): RecordAssistantExchange {
  return async (input) => {
    const conversationId =
      input.conversationId ??
      (
        await deps.conversations.create({
          ownerId: input.ownerId,
          title: deriveConversationTitle(input.question),
        })
      ).id;

    await deps.conversations.appendMessage(conversationId, {
      role: "user",
      text: input.question,
    });
    const webResults = (input.webResults ?? []).map((r) => ({ title: r.title, url: r.url }));
    await deps.conversations.appendMessage(conversationId, {
      role: "assistant",
      text: input.answer,
      kind: input.kind,
      ...(webResults.length > 0 ? { webResults } : {}),
    });

    return { conversationId };
  };
}

export type ListAssistantConversations = (
  ownerId: string,
) => Promise<readonly ConversationSummary[]>;

/** List of the owner's conversations for the "History" screen (newest first). */
export function makeListAssistantConversations(deps: {
  conversations: AssistantConversationRepository;
}): ListAssistantConversations {
  return (ownerId) => deps.conversations.listByOwner(ownerId);
}

export type GetAssistantConversation = (
  ownerId: string,
  id: AssistantConversationId,
) => Promise<AssistantConversationWithMessages | null>;

/** Open the owner's conversation with all messages (someone else's -> null, RBAC). */
export function makeGetAssistantConversation(deps: {
  conversations: AssistantConversationRepository;
}): GetAssistantConversation {
  return (ownerId, id) => deps.conversations.getById(ownerId, id);
}

export type SearchAssistantConversations = (
  ownerId: string,
  query: string,
) => Promise<readonly ConversationSearchHit[]>;

/** Search the owner's conversation history (substring match on messages; empty query -> []). */
export function makeSearchAssistantConversations(deps: {
  conversations: AssistantConversationRepository;
}): SearchAssistantConversations {
  return (ownerId, query) => deps.conversations.searchByOwner(ownerId, query);
}
