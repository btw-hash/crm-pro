import type {
  AssistantConversationRepository,
  AssistantConversationWithMessages,
  NewAssistantMessage,
} from "@/application/ports/assistant-conversation-repository";
import {
  buildSnippet,
  type AssistantConversation,
  type AssistantConversationId,
  type AssistantMessage,
  type ConversationSearchHit,
  type ConversationSummary,
} from "@/domain/assistant/conversation";
import { makeId } from "@/domain/shared/id";

/** Repository options: injectable clock and id generator — for determinism in tests. */
export interface InMemoryAssistantConversationRepositoryOptions {
  /** Time source (ISO). Defaults to the system clock. */
  readonly now?: () => string;
  /** Unique id generator. Defaults to crypto.randomUUID. */
  readonly newId?: () => string;
}

/**
 * In-memory storage for assistant conversations (demo; Postgres via Prisma in
 * production). Search is a case-insensitive substring match over message text.
 * All operations filter by `ownerId` (owner-based RBAC: other users'
 * conversations are inaccessible).
 */
export class InMemoryAssistantConversationRepository implements AssistantConversationRepository {
  private readonly conversations = new Map<string, AssistantConversation>();
  private readonly messagesByConversation = new Map<string, AssistantMessage[]>();
  private readonly now: () => string;
  private readonly newId: () => string;

  constructor(options: InMemoryAssistantConversationRepositoryOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.newId = options.newId ?? (() => crypto.randomUUID());
  }

  async create(input: { ownerId: string; title: string }): Promise<AssistantConversation> {
    const at = this.now();
    const conversation: AssistantConversation = {
      id: makeId<"AssistantConversationId">(this.newId()),
      ownerId: input.ownerId,
      title: input.title,
      createdAt: at,
      updatedAt: at,
    };
    this.conversations.set(conversation.id, conversation);
    this.messagesByConversation.set(conversation.id, []);
    return conversation;
  }

  async appendMessage(
    conversationId: AssistantConversationId,
    msg: NewAssistantMessage,
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    const at = this.now();
    const message: AssistantMessage = {
      id: makeId<"AssistantMessageId">(this.newId()),
      conversationId,
      role: msg.role,
      text: msg.text,
      ...(msg.kind ? { kind: msg.kind } : {}),
      ...(msg.webResults && msg.webResults.length > 0 ? { webResults: msg.webResults } : {}),
      createdAt: at,
    };
    const list = this.messagesByConversation.get(conversationId) ?? [];
    list.push(message);
    this.messagesByConversation.set(conversationId, list);
    // A new message moves the conversation to the top of the history list.
    this.conversations.set(conversationId, { ...conversation, updatedAt: at });
  }

  async listByOwner(ownerId: string): Promise<readonly ConversationSummary[]> {
    return [...this.conversations.values()]
      .filter((c) => c.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((c) => {
        const messages = this.messagesByConversation.get(c.id) ?? [];
        const last = messages.at(-1);
        return {
          id: c.id,
          title: c.title,
          updatedAt: c.updatedAt,
          preview: last ? buildSnippet(last.text, "") : "",
        };
      });
  }

  async getById(
    ownerId: string,
    id: AssistantConversationId,
  ): Promise<AssistantConversationWithMessages | null> {
    const conversation = this.conversations.get(id);
    // RBAC: don't return another owner's conversation — act as if it doesn't exist.
    if (!conversation || conversation.ownerId !== ownerId) {
      return null;
    }
    const messages = [...(this.messagesByConversation.get(id) ?? [])].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    return { ...conversation, messages };
  }

  async searchByOwner(ownerId: string, query: string): Promise<readonly ConversationSearchHit[]> {
    const trimmed = query.trim();
    if (trimmed === "") {
      return [];
    }
    const needle = trimmed.toLowerCase();
    const hits: ConversationSearchHit[] = [];
    const own = [...this.conversations.values()]
      .filter((c) => c.ownerId === ownerId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (const conversation of own) {
      const messages = this.messagesByConversation.get(conversation.id) ?? [];
      const match = messages.find((m) => m.text.toLowerCase().includes(needle));
      if (match) {
        hits.push({
          id: conversation.id,
          title: conversation.title,
          updatedAt: conversation.updatedAt,
          snippet: buildSnippet(match.text, trimmed),
        });
      }
    }
    return hits;
  }
}
