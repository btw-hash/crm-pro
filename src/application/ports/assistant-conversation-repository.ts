import type {
  AssistantConversation,
  AssistantConversationId,
  AssistantMessage,
  AssistantMessageKind,
  AssistantMessageRole,
  AssistantMessageWebResult,
  ConversationSearchHit,
  ConversationSummary,
} from "@/domain/assistant/conversation";

/** A conversation together with all of its messages (chronological order). */
export interface AssistantConversationWithMessages extends AssistantConversation {
  readonly messages: readonly AssistantMessage[];
}

/** A new message to append to a conversation (id/timestamp are set by the repository). */
export interface NewAssistantMessage {
  readonly role: AssistantMessageRole;
  readonly text: string;
  readonly kind?: AssistantMessageKind;
  /** Web sources for the answer (for reply messages that used web search). */
  readonly webResults?: readonly AssistantMessageWebResult[];
}

/**
 * Storage for the sales head's assistant conversations (history/memory). All
 * operations are scoped by `ownerId` (current user's id): other owners' conversations
 * are inaccessible (owner-based RBAC).
 */
export interface AssistantConversationRepository {
  /** Creates an empty conversation for the owner; id, createdAt, updatedAt are set by the repository. */
  create(input: { ownerId: string; title: string }): Promise<AssistantConversation>;

  /** Appends a message to the conversation and advances the conversation's `updatedAt` to the append time. */
  appendMessage(conversationId: AssistantConversationId, msg: NewAssistantMessage): Promise<void>;

  /** List of the owner's conversations: summaries (with a preview of the last message), newest first (updatedAt desc). */
  listByOwner(ownerId: string): Promise<readonly ConversationSummary[]>;

  /**
   * The owner's conversation with all its messages. `ownerId` is REQUIRED — another
   * owner's conversation is never returned (returns null even if a conversation with
   * that id exists for a different owner).
   */
  getById(
    ownerId: string,
    id: AssistantConversationId,
  ): Promise<AssistantConversationWithMessages | null>;

  /**
   * The owner's conversations where `query` appears in a message (case-insensitive
   * substring), with a snippet of the match. An empty/whitespace-only query returns
   * an empty result.
   */
  searchByOwner(ownerId: string, query: string): Promise<readonly ConversationSearchHit[]>;
}
