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
  type AssistantMessageKind,
  type AssistantMessageRole,
  type AssistantMessageWebResult,
  type ConversationSearchHit,
  type ConversationSummary,
} from "@/domain/assistant/conversation";
import { makeId } from "@/domain/shared/id";
import { prisma } from "./prisma-client";

/** Serializes web sources into a JSON string for the `webResults` column (or null when empty). */
function serializeWebResults(
  results: readonly AssistantMessageWebResult[] | undefined,
): string | null {
  if (!results || results.length === 0) {
    return null;
  }
  return JSON.stringify(results.map((r) => ({ title: r.title, url: r.url })));
}

/** Parses the `webResults` column JSON string back into an array (malformed JSON → empty). */
function parseWebResults(raw: string | null): readonly AssistantMessageWebResult[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.flatMap((item): AssistantMessageWebResult[] => {
      if (item !== null && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        if (typeof obj.title === "string" && typeof obj.url === "string") {
          return [{ title: obj.title, url: obj.url }];
        }
      }
      return [];
    });
  } catch {
    return [];
  }
}

function toConversation(row: {
  id: string;
  ownerId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}): AssistantConversation {
  return {
    id: makeId<"AssistantConversationId">(row.id),
    ownerId: row.ownerId,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessage(row: {
  id: string;
  conversationId: string;
  role: string;
  text: string;
  kind: string | null;
  webResults: string | null;
  createdAt: Date;
}): AssistantMessage {
  const webResults = parseWebResults(row.webResults);
  return {
    id: makeId<"AssistantMessageId">(row.id),
    conversationId: makeId<"AssistantConversationId">(row.conversationId),
    role: row.role as AssistantMessageRole,
    text: row.text,
    ...(row.kind ? { kind: row.kind as AssistantMessageKind } : {}),
    ...(webResults.length > 0 ? { webResults } : {}),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Postgres storage for assistant conversations (Prisma). Search is a
 * case-insensitive substring match (`contains`/`mode: insensitive`). All
 * operations filter by `ownerId` (owner-based RBAC).
 */
export class PrismaAssistantConversationRepository implements AssistantConversationRepository {
  async create(input: { ownerId: string; title: string }): Promise<AssistantConversation> {
    const at = new Date();
    const row = await prisma.assistantConversation.create({
      data: {
        id: crypto.randomUUID(),
        ownerId: input.ownerId,
        title: input.title,
        createdAt: at,
        updatedAt: at,
      },
    });
    return toConversation(row);
  }

  async appendMessage(
    conversationId: AssistantConversationId,
    msg: NewAssistantMessage,
  ): Promise<void> {
    const at = new Date();
    // Message insert + conversation updatedAt bump are atomic: the history list is sorted by updatedAt.
    await prisma.$transaction([
      prisma.assistantMessage.create({
        data: {
          id: crypto.randomUUID(),
          conversationId,
          role: msg.role,
          text: msg.text,
          kind: msg.kind ?? null,
          webResults: serializeWebResults(msg.webResults),
          createdAt: at,
        },
      }),
      prisma.assistantConversation.update({
        where: { id: conversationId },
        data: { updatedAt: at },
      }),
    ]);
  }

  async listByOwner(ownerId: string): Promise<readonly ConversationSummary[]> {
    const rows = await prisma.assistantConversation.findMany({
      where: { ownerId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return rows.map((row) => {
      const last = row.messages[0];
      return {
        id: makeId<"AssistantConversationId">(row.id),
        title: row.title,
        updatedAt: row.updatedAt.toISOString(),
        preview: last ? buildSnippet(last.text, "") : "",
      };
    });
  }

  async getById(
    ownerId: string,
    id: AssistantConversationId,
  ): Promise<AssistantConversationWithMessages | null> {
    const row = await prisma.assistantConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    // RBAC: don't return another owner's conversation — act as if it doesn't exist.
    if (!row || row.ownerId !== ownerId) {
      return null;
    }
    return {
      ...toConversation(row),
      messages: row.messages.map(toMessage),
    };
  }

  async searchByOwner(ownerId: string, query: string): Promise<readonly ConversationSearchHit[]> {
    const trimmed = query.trim();
    if (trimmed === "") {
      return [];
    }
    const rows = await prisma.assistantConversation.findMany({
      where: {
        ownerId,
        messages: { some: { text: { contains: trimmed, mode: "insensitive" } } },
      },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          where: { text: { contains: trimmed, mode: "insensitive" } },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    });
    return rows.map((row) => ({
      id: makeId<"AssistantConversationId">(row.id),
      title: row.title,
      updatedAt: row.updatedAt.toISOString(),
      snippet: buildSnippet(row.messages[0]?.text ?? "", trimmed),
    }));
  }
}
