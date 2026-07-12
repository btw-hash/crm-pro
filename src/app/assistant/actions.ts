"use server";

import type {
  AssistantConversationId,
  AssistantMessageKind,
  AssistantMessageRole,
} from "@/domain/assistant/conversation";
import { canUseManagerAssistant } from "@/domain/shared/role";
import { resolveViewer } from "@/infrastructure/config/current-user";
import { getContainer } from "@/infrastructure/composition-root";

export interface AssistantSource {
  readonly deals: number;
  readonly stalled: number;
  readonly clientsWithDebt: number;
}

export interface AssistantWebResult {
  readonly title: string;
  readonly url: string;
}

export interface AssistantSuccess {
  readonly ok: true;
  readonly answer: string;
  /** Source type: CRM snapshot, external web search, or a combination (tool agent). */
  readonly kind: AssistantMessageKind;
  /** Snapshot summary (when CRM is involved) — transparency about "where the numbers come from". */
  readonly source: AssistantSource | null;
  /** Web sources found (when web search is involved). */
  readonly webResults: readonly AssistantWebResult[];
  /** Conversation the exchange was recorded into (new or existing) — for further follow-ups. */
  readonly conversationId: string;
}

export interface AssistantFailure {
  readonly ok: false;
  readonly error: string;
}

export type AssistantReply = AssistantSuccess | AssistantFailure;

/** One conversation turn passed by the client for follow-up context. */
export interface AssistantTurnInput {
  readonly role: AssistantMessageRole;
  readonly text: string;
}

export interface AskAssistantInput {
  readonly question: string;
  /** null → new conversation; otherwise append to an existing one. */
  readonly conversationId: string | null;
  /** Previous turns of this conversation (for follow-ups like "any links?"). */
  readonly conversation: readonly AssistantTurnInput[];
}

const ACCESS_DENIED = "The manager assistant is available only to this role." as const;

export async function askAssistantAction(input: AskAssistantInput): Promise<AssistantReply> {
  // The assistant builds its answer from a snapshot of the whole department → head of sales only.
  const viewer = await resolveViewer();
  if (!viewer || !canUseManagerAssistant(viewer.role)) {
    return { ok: false, error: ACCESS_DENIED };
  }
  const trimmed = input.question.trim();
  if (trimmed === "") {
    return { ok: false, error: "Enter a question." };
  }
  const container = getContainer();
  try {
    const { answer, source, snapshot, webResults } = await container.askManagerAssistant({
      question: trimmed,
      // Conversation context: previous turns for follow-ups. Empty on the first question.
      conversation: input.conversation.map((turn) => ({ role: turn.role, text: turn.text })),
    });
    // Save the exchange to history: null → creates a conversation (title from the question),
    // otherwise appends to it.
    const { conversationId } = await container.recordAssistantExchange({
      ownerId: viewer.id,
      conversationId: (input.conversationId as AssistantConversationId | null) ?? null,
      question: trimmed,
      answer,
      kind: source,
      webResults: webResults ?? [],
    });
    // The tool agent picks its own tools: we show the snapshot summary if CRM was
    // involved, and web sources if web search was involved (for "mixed" — both).
    return {
      ok: true,
      answer,
      kind: source,
      source: snapshot
        ? {
            deals: snapshot.deals.length,
            stalled: snapshot.deals.filter((deal) => deal.stalled).length,
            clientsWithDebt: snapshot.clientsWithDebt.length,
          }
        : null,
      webResults: (webResults ?? []).map((r) => ({ title: r.title, url: r.url })),
      conversationId,
    };
  } catch (cause) {
    container.logger.error("assistant.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return { ok: false, error: "Could not get an answer from the assistant. Please try again." };
  }
}

/** Conversation summary for the "History" list (serializable DTO, dates as ISO strings). */
export interface ConversationSummaryDto {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly preview: string;
}

/** Conversation found in search: summary + match snippet. */
export interface ConversationHitDto {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly snippet: string;
}

/** Message of an open conversation (serializable DTO). */
export interface ConversationMessageDto {
  readonly role: AssistantMessageRole;
  readonly text: string;
  readonly kind?: AssistantMessageKind;
  /** Clickable web sources of the answer (restored when opened from history, #15). */
  readonly webResults?: readonly AssistantWebResult[];
  readonly createdAt: string;
}

/** Open conversation with all messages (serializable DTO). */
export interface ConversationDetailDto {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: string;
  readonly messages: readonly ConversationMessageDto[];
}

export type ListConversationsResult =
  | { readonly ok: true; readonly conversations: readonly ConversationSummaryDto[] }
  | AssistantFailure;

export async function listConversationsAction(): Promise<ListConversationsResult> {
  const viewer = await resolveViewer();
  if (!viewer || !canUseManagerAssistant(viewer.role)) {
    return { ok: false, error: ACCESS_DENIED };
  }
  const container = getContainer();
  try {
    const summaries = await container.listAssistantConversations(viewer.id);
    return {
      ok: true,
      conversations: summaries.map((s) => ({
        id: s.id,
        title: s.title,
        updatedAt: s.updatedAt,
        preview: s.preview,
      })),
    };
  } catch (cause) {
    container.logger.error("assistant.list.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return { ok: false, error: "Could not load the conversation history." };
  }
}

export type GetConversationResult =
  | { readonly ok: true; readonly conversation: ConversationDetailDto }
  | AssistantFailure;

export async function getConversationAction(id: string): Promise<GetConversationResult> {
  const viewer = await resolveViewer();
  if (!viewer || !canUseManagerAssistant(viewer.role)) {
    return { ok: false, error: ACCESS_DENIED };
  }
  const container = getContainer();
  try {
    // RBAC: the repository returns null if the conversation belongs to another owner.
    const found = await container.getAssistantConversation(
      viewer.id,
      id as AssistantConversationId,
    );
    if (!found) {
      return { ok: false, error: "Conversation not found." };
    }
    return {
      ok: true,
      conversation: {
        id: found.id,
        title: found.title,
        updatedAt: found.updatedAt,
        messages: found.messages.map((m) => ({
          role: m.role,
          text: m.text,
          ...(m.kind ? { kind: m.kind } : {}),
          ...(m.webResults && m.webResults.length > 0
            ? { webResults: m.webResults.map((r) => ({ title: r.title, url: r.url })) }
            : {}),
          createdAt: m.createdAt,
        })),
      },
    };
  } catch (cause) {
    container.logger.error("assistant.get.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return { ok: false, error: "Could not open the conversation." };
  }
}

export type SearchConversationsResult =
  | { readonly ok: true; readonly hits: readonly ConversationHitDto[] }
  | AssistantFailure;

export async function searchConversationsAction(query: string): Promise<SearchConversationsResult> {
  const viewer = await resolveViewer();
  if (!viewer || !canUseManagerAssistant(viewer.role)) {
    return { ok: false, error: ACCESS_DENIED };
  }
  const container = getContainer();
  try {
    const hits = await container.searchAssistantConversations(viewer.id, query);
    return {
      ok: true,
      hits: hits.map((h) => ({
        id: h.id,
        title: h.title,
        updatedAt: h.updatedAt,
        snippet: h.snippet,
      })),
    };
  } catch (cause) {
    container.logger.error("assistant.search.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return { ok: false, error: "Could not perform the search." };
  }
}
