import { describe, expect, it } from "vitest";
import { InMemoryAssistantConversationRepository } from "./in-memory-assistant-conversation-repository";

/**
 * Deterministic factory: a monotonic clock (each now() call advances by one
 * second) and an id counter. This keeps sorting-by-updatedAt and
 * updatedAt-growth tests stable.
 */
function makeRepo() {
  let tick = 0;
  let id = 0;
  return new InMemoryAssistantConversationRepository({
    now: () => `2026-06-27T00:00:${String(tick++).padStart(2, "0")}.000Z`,
    newId: () => `id-${id++}`,
  });
}

describe("InMemoryAssistantConversationRepository", () => {
  it("create sets up the owner's conversation with equal createdAt/updatedAt", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-1", title: "What's stuck?" });

    expect(conv.ownerId).toBe("head-1");
    expect(conv.title).toBe("What's stuck?");
    expect(conv.createdAt).toBe(conv.updatedAt);
    expect(conv.id).not.toBe("");
  });

  it("appendMessage adds messages and advances updatedAt forward", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-1", title: "T" });
    const createdAt = conv.updatedAt;

    await repo.appendMessage(conv.id, { role: "user", text: "question" });
    await repo.appendMessage(conv.id, { role: "assistant", text: "answer", kind: "crm" });

    const loaded = await repo.getById("head-1", conv.id);
    expect(loaded?.messages).toHaveLength(2);
    expect(loaded?.messages[0]?.role).toBe("user");
    expect(loaded?.messages[1]?.role).toBe("assistant");
    expect(loaded?.messages[1]?.kind).toBe("crm");
    // updatedAt grew relative to the creation time.
    expect(loaded && loaded.updatedAt > createdAt).toBe(true);
  });

  it("listByOwner sorts by updatedAt desc and gives a preview of the last message", async () => {
    const repo = makeRepo();
    const a = await repo.create({ ownerId: "head-1", title: "Conversation A" });
    const b = await repo.create({ ownerId: "head-1", title: "Conversation B" });
    // We write to A later — it should end up above B.
    await repo.appendMessage(b.id, { role: "user", text: "message in B" });
    await repo.appendMessage(a.id, { role: "user", text: "last message in A" });

    const list = await repo.listByOwner("head-1");
    expect(list.map((c) => c.title)).toEqual(["Conversation A", "Conversation B"]);
    expect(list[0]?.preview).toContain("last message in A");
  });

  it("listByOwner does not show other owners' conversations (RBAC)", async () => {
    const repo = makeRepo();
    await repo.create({ ownerId: "head-1", title: "Mine" });
    await repo.create({ ownerId: "head-2", title: "Someone else's" });

    const mine = await repo.listByOwner("head-1");
    expect(mine.map((c) => c.title)).toEqual(["Mine"]);
  });

  it("getById returns null for another owner's ownerId (RBAC)", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-1", title: "Private" });
    await repo.appendMessage(conv.id, { role: "user", text: "secret" });

    expect(await repo.getById("head-1", conv.id)).not.toBeNull();
    expect(await repo.getById("head-2", conv.id)).toBeNull();
  });

  it("getById returns messages in chronological order (createdAt asc)", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-1", title: "T" });
    await repo.appendMessage(conv.id, { role: "user", text: "first" });
    await repo.appendMessage(conv.id, { role: "assistant", text: "second" });

    const loaded = await repo.getById("head-1", conv.id);
    expect(loaded?.messages.map((m) => m.text)).toEqual(["first", "second"]);
  });

  it("searchByOwner finds a conversation by substring (case-insensitive) with a snippet", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-1", title: "About cocoa" });
    await repo.appendMessage(conv.id, {
      role: "assistant",
      text: "Found cocoa wholesale suppliers in the US.",
      kind: "web",
    });

    const hits = await repo.searchByOwner("head-1", "cocoa");
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe(conv.id);
    expect(hits[0]?.snippet.toLowerCase()).toContain("cocoa");
  });

  it("searchByOwner does not find other owners' conversations (RBAC)", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-2", title: "Someone else's" });
    await repo.appendMessage(conv.id, { role: "user", text: "unique-word" });

    expect(await repo.searchByOwner("head-1", "unique-word")).toEqual([]);
  });

  it("searchByOwner returns an empty array for an empty/whitespace query", async () => {
    const repo = makeRepo();
    const conv = await repo.create({ ownerId: "head-1", title: "T" });
    await repo.appendMessage(conv.id, { role: "user", text: "any text" });

    expect(await repo.searchByOwner("head-1", "")).toEqual([]);
    expect(await repo.searchByOwner("head-1", "   ")).toEqual([]);
  });
});
