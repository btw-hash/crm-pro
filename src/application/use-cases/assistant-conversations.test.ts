import { describe, expect, it } from "vitest";
import { InMemoryAssistantConversationRepository } from "@/infrastructure/persistence/in-memory-assistant-conversation-repository";
import {
  makeGetAssistantConversation,
  makeListAssistantConversations,
  makeRecordAssistantExchange,
  makeSearchAssistantConversations,
} from "./assistant-conversations";

function makeDeps() {
  let tick = 0;
  let id = 0;
  const conversations = new InMemoryAssistantConversationRepository({
    now: () => `2026-06-27T00:00:${String(tick++).padStart(2, "0")}.000Z`,
    newId: () => `id-${id++}`,
  });
  return { conversations };
}

describe("recordAssistantExchange", () => {
  it("conversationId=null -> creates a conversation with a title from the question + 2 messages", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const get = makeGetAssistantConversation(deps);

    const { conversationId } = await record({
      ownerId: "head-1",
      conversationId: null,
      question: "Which deals are stalled?",
      answer: 'The deal "Deal 1" is stalled.',
      kind: "crm",
    });

    const conv = await get("head-1", conversationId);
    expect(conv).not.toBeNull();
    expect(conv?.title).toBe("Which deals are stalled?");
    expect(conv?.messages).toHaveLength(2);
    expect(conv?.messages[0]).toMatchObject({ role: "user", text: "Which deals are stalled?" });
    expect(conv?.messages[1]).toMatchObject({
      role: "assistant",
      text: 'The deal "Deal 1" is stalled.',
      kind: "crm",
    });
  });

  it("conversationId given -> appends to the existing conversation (4 messages), updatedAt grows", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const get = makeGetAssistantConversation(deps);

    const first = await record({
      ownerId: "head-1",
      conversationId: null,
      question: "How's the pipeline?",
      answer: "Win rate 25%.",
      kind: "crm",
    });
    const afterFirst = await get("head-1", first.conversationId);
    const updatedAfterFirst = afterFirst?.updatedAt ?? "";

    const second = await record({
      ownerId: "head-1",
      conversationId: first.conversationId,
      question: "Any links?",
      answer: "No sources — this is CRM data.",
      kind: "crm",
    });

    expect(second.conversationId).toBe(first.conversationId);
    const conv = await get("head-1", first.conversationId);
    expect(conv?.messages).toHaveLength(4);
    // The title stayed from the first question.
    expect(conv?.title).toBe("How's the pipeline?");
    expect(conv && conv.updatedAt > updatedAfterFirst).toBe(true);
  });

  it("saves the answer's kind (web) — for source transparency", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const get = makeGetAssistantConversation(deps);

    const { conversationId } = await record({
      ownerId: "head-1",
      conversationId: null,
      question: "Find bakeries in Austin",
      answer: "Sunrise Bakery Co., Croissant & Co Bakery.",
      kind: "web",
      webResults: [{ title: "Sunrise Bakery Co.", snippet: "bakery", url: "https://a.example" }],
    });

    const conv = await get("head-1", conversationId);
    expect(conv?.messages[1]?.kind).toBe("web");
  });

  it("saves the answer's web sources (title/url) for restoring from history (#15)", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const get = makeGetAssistantConversation(deps);

    const { conversationId } = await record({
      ownerId: "head-1",
      conversationId: null,
      question: "Find bakeries in Austin",
      answer: "Sunrise Bakery Co.",
      kind: "web",
      webResults: [
        { title: "Sunrise Bakery Co.", snippet: "bakery", url: "https://a.example" },
        { title: "Croissant & Co Bakery", snippet: "cafe", url: "https://b.example" },
      ],
    });

    const conv = await get("head-1", conversationId);
    const reply = conv?.messages[1];
    expect(reply?.webResults).toEqual([
      { title: "Sunrise Bakery Co.", url: "https://a.example" },
      { title: "Croissant & Co Bakery", url: "https://b.example" },
    ]);
    // The user's question has no sources.
    expect(conv?.messages[0]?.webResults).toBeUndefined();
  });

  it("without web sources, the answer's webResults field is absent (crm answer)", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const get = makeGetAssistantConversation(deps);

    const { conversationId } = await record({
      ownerId: "head-1",
      conversationId: null,
      question: "What's stalled?",
      answer: "Deal X is stalled.",
      kind: "crm",
    });

    const conv = await get("head-1", conversationId);
    expect(conv?.messages[1]?.webResults).toBeUndefined();
  });
});

describe("listAssistantConversations / RBAC", () => {
  it("returns only the owner's conversations, newest first", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const list = makeListAssistantConversations(deps);

    await record({
      ownerId: "head-1",
      conversationId: null,
      question: "First",
      answer: "answer1",
      kind: "crm",
    });
    await record({
      ownerId: "head-1",
      conversationId: null,
      question: "Second",
      answer: "answer2",
      kind: "crm",
    });
    await record({
      ownerId: "head-2",
      conversationId: null,
      question: "Someone else's",
      answer: "answer",
      kind: "crm",
    });

    const mine = await list("head-1");
    expect(mine.map((c) => c.title)).toEqual(["Second", "First"]);
  });
});

describe("getAssistantConversation / RBAC", () => {
  it("someone else's ownerId -> null", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const get = makeGetAssistantConversation(deps);

    const { conversationId } = await record({
      ownerId: "head-1",
      conversationId: null,
      question: "Private question",
      answer: "answer",
      kind: "crm",
    });

    expect(await get("head-2", conversationId)).toBeNull();
  });
});

describe("searchAssistantConversations", () => {
  it("finds by message substring; empty query -> []", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const search = makeSearchAssistantConversations(deps);

    await record({
      ownerId: "head-1",
      conversationId: null,
      question: "Search cocoa suppliers",
      answer: "Found a few options.",
      kind: "web",
    });

    const hits = await search("head-1", "cocoa");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.snippet.toLowerCase()).toContain("cocoa");
    expect(await search("head-1", "")).toEqual([]);
  });

  it("does not find someone else's conversations (RBAC)", async () => {
    const deps = makeDeps();
    const record = makeRecordAssistantExchange(deps);
    const search = makeSearchAssistantConversations(deps);

    await record({
      ownerId: "head-2",
      conversationId: null,
      question: "Unique-word-XYZ",
      answer: "answer",
      kind: "crm",
    });

    expect(await search("head-1", "Unique-word-XYZ")).toEqual([]);
  });
});
