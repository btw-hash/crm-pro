import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveViewer } = vi.hoisted(() => ({ resolveViewer: vi.fn() }));
const container = vi.hoisted(() => ({
  askManagerAssistant: vi.fn(),
  recordAssistantExchange: vi.fn(),
  listAssistantConversations: vi.fn(),
  getAssistantConversation: vi.fn(),
  searchAssistantConversations: vi.fn(),
  logger: { error: vi.fn() },
}));

vi.mock("@/infrastructure/config/current-user", () => ({ resolveViewer }));
vi.mock("@/infrastructure/composition-root", () => ({ getContainer: () => container }));

import {
  askAssistantAction,
  getConversationAction,
  listConversationsAction,
  searchConversationsAction,
} from "./actions";

const HEAD = { id: "head-alexander", role: "head" as const };
const MANAGER = { id: "owens", role: "manager" as const };

beforeEach(() => {
  resolveViewer.mockResolvedValue(HEAD);
  container.askManagerAssistant.mockResolvedValue({
    answer: "Answer",
    source: "web",
    snapshot: null,
    webResults: [
      { title: "Golden Valley Mills", snippet: "…", url: "https://goldenvalleymills.com" },
    ],
  });
  container.recordAssistantExchange.mockResolvedValue({ conversationId: "conv-42" });
  container.listAssistantConversations.mockResolvedValue([
    { id: "c1", title: "Topic", updatedAt: "2026-06-27T10:00:00.000Z", preview: "Hello" },
  ]);
  container.getAssistantConversation.mockResolvedValue({
    id: "c1",
    ownerId: "head-alexander",
    title: "Topic",
    createdAt: "2026-06-27T09:00:00.000Z",
    updatedAt: "2026-06-27T10:00:00.000Z",
    messages: [
      {
        id: "m1",
        conversationId: "c1",
        role: "user",
        text: "Hello",
        createdAt: "2026-06-27T09:00:00.000Z",
      },
    ],
  });
  container.searchAssistantConversations.mockResolvedValue([
    { id: "c1", title: "Topic", updatedAt: "2026-06-27T10:00:00.000Z", snippet: "…Hello…" },
  ]);
});

afterEach(() => vi.clearAllMocks());

describe("askAssistantAction", () => {
  it("RBAC: a non-head-of-sales is denied, use-cases are not called", async () => {
    resolveViewer.mockResolvedValue(MANAGER);
    const result = await askAssistantAction({
      question: "q",
      conversationId: null,
      conversation: [],
    });
    expect(result).toEqual({ ok: false, error: expect.stringContaining("only to this role") });
    expect(container.askManagerAssistant).not.toHaveBeenCalled();
    expect(container.recordAssistantExchange).not.toHaveBeenCalled();
  });

  it("passes the conversation context into askManagerAssistant", async () => {
    await askAssistantAction({
      question: "  Second  ",
      conversationId: "conv-42",
      conversation: [{ role: "user", text: "First" }],
    });
    expect(container.askManagerAssistant).toHaveBeenCalledWith({
      question: "Second",
      conversation: [{ role: "user", text: "First" }],
    });
  });

  it("saves the exchange and returns conversationId + clickable sources", async () => {
    const result = await askAssistantAction({
      question: "Find",
      conversationId: null,
      conversation: [],
    });
    expect(container.recordAssistantExchange).toHaveBeenCalledWith({
      ownerId: "head-alexander",
      conversationId: null,
      question: "Find",
      answer: "Answer",
      kind: "web",
      webResults: [
        { title: "Golden Valley Mills", snippet: "…", url: "https://goldenvalleymills.com" },
      ],
    });
    if (!result.ok) throw new Error("expected ok");
    expect(result.conversationId).toBe("conv-42");
    expect(result.webResults).toEqual([
      { title: "Golden Valley Mills", url: "https://goldenvalleymills.com" },
    ]);
  });

  it("empty question — error without calling the assistant", async () => {
    const result = await askAssistantAction({
      question: "   ",
      conversationId: null,
      conversation: [],
    });
    expect(result).toEqual({ ok: false, error: "Enter a question." });
    expect(container.askManagerAssistant).not.toHaveBeenCalled();
  });
});

describe("listConversationsAction / getConversationAction / searchConversationsAction", () => {
  it("list: by viewer.id, serializable DTO", async () => {
    const result = await listConversationsAction();
    expect(container.listAssistantConversations).toHaveBeenCalledWith("head-alexander");
    if (!result.ok) throw new Error("expected ok");
    expect(result.conversations[0]).toEqual({
      id: "c1",
      title: "Topic",
      updatedAt: "2026-06-27T10:00:00.000Z",
      preview: "Hello",
    });
  });

  it("get: by viewer.id (RBAC), messages as DTOs", async () => {
    const result = await getConversationAction("c1");
    expect(container.getAssistantConversation).toHaveBeenCalledWith("head-alexander", "c1");
    if (!result.ok) throw new Error("expected ok");
    expect(result.conversation.messages).toEqual([
      { role: "user", text: "Hello", createdAt: "2026-06-27T09:00:00.000Z" },
    ]);
  });

  it("get: someone else's conversation (null from repo) → error", async () => {
    container.getAssistantConversation.mockResolvedValue(null);
    const result = await getConversationAction("c1");
    expect(result).toEqual({ ok: false, error: "Conversation not found." });
  });

  it("search: by viewer.id, hits as DTOs", async () => {
    const result = await searchConversationsAction("hel");
    expect(container.searchAssistantConversations).toHaveBeenCalledWith("head-alexander", "hel");
    if (!result.ok) throw new Error("expected ok");
    expect(result.hits[0]?.snippet).toBe("…Hello…");
  });

  it("RBAC: a non-head-of-sales is denied on all three actions", async () => {
    resolveViewer.mockResolvedValue(MANAGER);
    expect((await listConversationsAction()).ok).toBe(false);
    expect((await getConversationAction("c1")).ok).toBe(false);
    expect((await searchConversationsAction("x")).ok).toBe(false);
    expect(container.listAssistantConversations).not.toHaveBeenCalled();
    expect(container.getAssistantConversation).not.toHaveBeenCalled();
    expect(container.searchAssistantConversations).not.toHaveBeenCalled();
  });
});
