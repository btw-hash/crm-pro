import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  askAssistantAction,
  listConversationsAction,
  getConversationAction,
  searchConversationsAction,
} = vi.hoisted(() => ({
  askAssistantAction: vi.fn(),
  listConversationsAction: vi.fn(),
  getConversationAction: vi.fn(),
  searchConversationsAction: vi.fn(),
}));

vi.mock("../actions", () => ({
  askAssistantAction,
  listConversationsAction,
  getConversationAction,
  searchConversationsAction,
}));

import { AssistantChat } from "./assistant-chat";

const SUMMARY = {
  id: "conv-1",
  title: "Flour suppliers",
  updatedAt: "2026-06-27T10:00:00.000Z",
  preview: "Find flour suppliers",
};

beforeEach(() => {
  listConversationsAction.mockResolvedValue({ ok: true, conversations: [SUMMARY] });
  getConversationAction.mockResolvedValue({
    ok: true,
    conversation: {
      id: "conv-1",
      title: "Flour suppliers",
      updatedAt: "2026-06-27T10:00:00.000Z",
      messages: [
        { role: "user", text: "Find flour suppliers", createdAt: "2026-06-27T10:00:00.000Z" },
        {
          role: "assistant",
          text: "Here are some options",
          kind: "web",
          createdAt: "2026-06-27T10:00:01.000Z",
        },
      ],
    },
  });
  searchConversationsAction.mockResolvedValue({ ok: true, hits: [] });
  askAssistantAction.mockResolvedValue({
    ok: true,
    answer: "Done",
    kind: "crm",
    source: { deals: 3, stalled: 1, clientsWithDebt: 2 },
    webResults: [],
    conversationId: "conv-new",
  });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("AssistantChat — history", () => {
  it("loads the conversation list on mount", async () => {
    render(<AssistantChat />);
    expect(await screen.findByText("Flour suppliers")).toBeTruthy();
    expect(listConversationsAction).toHaveBeenCalledTimes(1);
  });

  it("opening a conversation loads its messages into the chat", async () => {
    render(<AssistantChat />);
    const card = await screen.findByText("Flour suppliers");
    fireEvent.click(card.closest("button") as HTMLButtonElement);
    expect(await screen.findByText("Here are some options")).toBeTruthy();
    expect(getConversationAction).toHaveBeenCalledWith("conv-1");
  });

  it('"New conversation" clears the thread and resets the context', async () => {
    render(<AssistantChat />);
    // Open a conversation so there's something to clear.
    fireEvent.click((await screen.findByText("Flour suppliers")).closest("button")!);
    expect(await screen.findByText("Here are some options")).toBeTruthy();
    fireEvent.click(screen.getByText("+ New conversation"));
    await waitFor(() => expect(screen.queryByText("Here are some options")).toBeNull());
  });

  it("search (debounced) calls searchConversationsAction and shows a snippet", async () => {
    searchConversationsAction.mockResolvedValue({
      ok: true,
      hits: [
        {
          id: "conv-1",
          title: "Flour suppliers",
          updatedAt: "2026-06-27T10:00:00.000Z",
          snippet: "…top-grade flour…",
        },
      ],
    });
    render(<AssistantChat />);
    await screen.findByText("Flour suppliers");
    fireEvent.change(screen.getByLabelText("Search history"), { target: { value: "flour" } });
    expect(await screen.findByText("…top-grade flour…")).toBeTruthy();
    expect(searchConversationsAction).toHaveBeenCalledWith("flour");
  });

  it("sending a question passes the conversation context and conversationId to the action", async () => {
    render(<AssistantChat />);
    await screen.findByText("Flour suppliers");
    // First question — context is empty, conversationId=null.
    fireEvent.change(screen.getByPlaceholderText(/Ask about/), {
      target: { value: "First question" },
    });
    fireEvent.click(screen.getByLabelText("Ask"));
    await screen.findByText("Done");
    expect(askAssistantAction).toHaveBeenLastCalledWith({
      question: "First question",
      conversationId: null,
      conversation: [],
    });

    // Second question — conversationId now comes from the reply, context = the previous turn.
    fireEvent.change(screen.getByPlaceholderText(/Ask about/), {
      target: { value: "Second question" },
    });
    fireEvent.click(screen.getByLabelText("Ask"));
    await waitFor(() =>
      expect(askAssistantAction).toHaveBeenLastCalledWith({
        question: "Second question",
        conversationId: "conv-new",
        conversation: [
          { role: "user", text: "First question" },
          { role: "assistant", text: "Done" },
        ],
      }),
    );
  });

  it("web sources render as clickable links (title → href, new tab)", async () => {
    askAssistantAction.mockResolvedValue({
      ok: true,
      answer: "Found some companies",
      kind: "web",
      source: null,
      webResults: [{ title: "Golden Valley Mills", url: "https://goldenvalleymills.com" }],
      conversationId: "conv-x",
    });
    render(<AssistantChat />);
    await screen.findByText("Flour suppliers");
    fireEvent.change(screen.getByPlaceholderText(/Ask about/), { target: { value: "suppliers" } });
    fireEvent.click(screen.getByLabelText("Ask"));
    const link = (await screen.findByText("Golden Valley Mills")) as HTMLAnchorElement;
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://goldenvalleymills.com");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
