"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { estimateLlmCost } from "@/application/ai/llm-cost";
import { Money } from "@/domain/pricing/money";
import {
  askAssistantAction,
  getConversationAction,
  listConversationsAction,
  searchConversationsAction,
  type AssistantSource,
  type AssistantWebResult,
  type ConversationHitDto,
  type ConversationSummaryDto,
} from "../actions";
import { AssistantHistoryPanel } from "./assistant-history-panel";

const EXAMPLES = [
  "Which processes are stuck without a next step?",
  "Who is over their credit limit?",
  "Show me manager workload.",
  "Find new ingredient suppliers",
];

/** Delay before firing a history search request — so we don't hit the server on every keystroke. */
const SEARCH_DEBOUNCE_MS = 250;

interface Turn {
  readonly id: number;
  readonly question: string;
  readonly answer: string;
  readonly kind: "crm" | "web" | "mixed";
  readonly source: AssistantSource | null;
  readonly webResults: readonly AssistantWebResult[];
  readonly tokens: number;
  readonly costMinor: number;
}

/**
 * Head of sales chat assistant (#216) with history/memory (#340): the conversation
 * accumulates as a thread (question → answer over a CRM/web snapshot), each exchange is
 * SAVED on the server (per owner). On the left is a "History" panel (list + search +
 * "New conversation"); opening a conversation loads its messages. Conversation context
 * (previous turns) is passed to the action for follow-ups. Each reply shows a cost
 * ESTIMATE (tokens/$). Numbers come from the CRM, the AI does not invent them.
 */
export function AssistantChat() {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Synchronous lock: disabled={pending} only applies after a re-render, so a fast
  // double-click could slip through two LLM calls (and double-count the cost).
  const busyRef = useRef(false);

  // Owner's conversation history.
  const [conversations, setConversations] = useState<readonly ConversationSummaryDto[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  // History search.
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<readonly ConversationHitDto[] | null>(null);

  const totalMinor = turns.reduce((sum, t) => sum + t.costMinor, 0);
  const totalTokens = turns.reduce((sum, t) => sum + t.tokens, 0);

  const reloadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const result = await listConversationsAction();
      if (result.ok) setConversations(result.conversations);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Load the conversation list on mount.
  useEffect(() => {
    void reloadHistory();
  }, [reloadHistory]);

  // History search with debounce; an empty query → the regular list (searchHits=null).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      setSearchHits(null);
      return;
    }
    let cancelled = false;
    setHistoryLoading(true);
    const timer = setTimeout(async () => {
      const result = await searchConversationsAction(trimmed);
      if (cancelled) return;
      setSearchHits(result.ok ? result.hits : []);
      setHistoryLoading(false);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Open a saved conversation: load its messages into the thread and remember conversationId.
  async function openConversation(id: string) {
    if (busyRef.current) return;
    setError(null);
    const result = await getConversationAction(id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const loaded: Turn[] = [];
    const { messages } = result.conversation;
    // Messages are chronological (user, assistant, user, …) — we group them into Turns in pairs.
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || msg.role !== "user") continue;
      const next = messages[i + 1];
      const reply = next?.role === "assistant" ? next : null;
      const kind = reply?.kind ?? "crm";
      loaded.push({
        id: loaded.length,
        question: msg.text,
        answer: reply?.text ?? "",
        kind,
        // The snapshot summary isn't stored in detail (we only show the source type), but
        // clickable web sources are restored from history (#15).
        source: null,
        webResults: reply?.webResults ?? [],
        tokens: 0,
        costMinor: 0,
      });
    }
    setTurns(loaded);
    setConversationId(result.conversation.id);
  }

  // Start a new conversation: clear the thread and reset the conversationId binding.
  function startNew() {
    if (busyRef.current) return;
    setTurns([]);
    setConversationId(null);
    setError(null);
    setQuestion("");
  }

  async function ask(text: string) {
    const trimmed = text.trim();
    if (trimmed === "" || busyRef.current) return;
    busyRef.current = true;
    setPending(true);
    setError(null);
    // Conversation context: previous turns (question+answer of each turn) for follow-ups.
    // We skip turns with an empty question/answer — an empty assistant reply would break
    // the interpretation of a clarification ("any links?" should refer to a real answer,
    // not to emptiness) (#16).
    const conversation = turns.flatMap((t) =>
      t.question.trim() === "" || t.answer.trim() === ""
        ? []
        : [
            { role: "user" as const, text: t.question },
            { role: "assistant" as const, text: t.answer },
          ],
    );
    try {
      const result = await askAssistantAction({ question: trimmed, conversationId, conversation });
      if (result.ok) {
        const { tokens, costMinor } = estimateLlmCost(trimmed + result.answer);
        setTurns((prev) => [
          ...prev,
          {
            id: prev.length,
            question: trimmed,
            answer: result.answer,
            kind: result.kind,
            source: result.source,
            webResults: result.webResults,
            tokens,
            costMinor,
          },
        ]);
        setQuestion("");
        // Remember the conversation (new or current), so the next turns write into it.
        setConversationId(result.conversationId);
        // Refresh the history list (a new conversation will appear at the top, dates update).
        void reloadHistory();
      } else {
        setError(result.error);
      }
    } catch {
      setError("Could not reach the assistant. Please try again.");
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      <AssistantHistoryPanel
        conversations={conversations}
        searchHits={searchHits}
        query={query}
        activeId={conversationId}
        loading={historyLoading}
        onQueryChange={setQuery}
        onSelect={(id) => void openConversation(id)}
        onNew={startNew}
      />

      <div style={{ flex: 1, maxWidth: 840, minWidth: 0 }}>
        {turns.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              marginBottom: 16,
            }}
          >
            {turns.map((turn) => (
              <div key={turn.id} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    alignSelf: "flex-end",
                    maxWidth: "78%",
                    background: "#f6e7e2",
                    borderRadius: "16px 16px 4px 16px",
                    padding: "12px 16px",
                    font: "500 13px Arial",
                    color: "#16181d",
                  }}
                >
                  {turn.question}
                </div>
                <div
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "88%",
                    background: "rgba(255,255,255,0.6)",
                    backdropFilter: "blur(22px) saturate(1.3)",
                    WebkitBackdropFilter: "blur(22px) saturate(1.3)",
                    border: "1px solid rgba(255,255,255,0.7)",
                    boxShadow:
                      "0 12px 34px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.85)",
                    borderRadius: "16px 16px 16px 4px",
                    padding: "16px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 8,
                        background: "#1c1f27",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="M7 17L17 7M17 7H8M17 7v9" />
                      </svg>
                    </span>
                    <span style={{ font: "700 12px Arial", color: "#6b6f78" }}>
                      CRM Pro Assistant
                    </span>
                  </div>
                  <div
                    style={{
                      font: "400 13px/1.55 Arial",
                      color: "#2b303c",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {turn.answer}
                  </div>
                  <div
                    style={{
                      font: "400 11px Arial",
                      color: "#9a9ea8",
                      marginTop: 10,
                      paddingTop: 10,
                      borderTop: "1px solid #eef0f2",
                    }}
                  >
                    {turn.kind === "web"
                      ? "Web search"
                      : turn.kind === "mixed"
                        ? `CRM + web search · snapshot: ${turn.source?.deals ?? 0} processes (${
                            turn.source?.stalled ?? 0
                          } stalled), ${turn.source?.clientsWithDebt ?? 0} clients with a balance`
                        : `CRM snapshot: ${turn.source?.deals ?? 0} processes (${
                            turn.source?.stalled ?? 0
                          } stalled), ${turn.source?.clientsWithDebt ?? 0} clients with a balance`}
                    {turn.tokens > 0
                      ? ` · ≈ ${turn.tokens} tokens · ${Money.of(turn.costMinor).format()}`
                      : ""}
                  </div>
                  {turn.webResults.length > 0 ? (
                    <ul
                      style={{
                        listStyle: "none",
                        margin: "9px 0 0",
                        padding: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                      }}
                    >
                      {turn.webResults.map((r) => (
                        <li key={r.url}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              font: "600 12px Arial",
                              color: "#bf322b",
                              textDecoration: "underline",
                            }}
                          >
                            {r.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Empty "New conversation" state: no turns in the current thread. Show a
          // placeholder inviting a question.
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              textAlign: "center",
              padding: "48px 20px",
              marginBottom: 16,
              border: "1px dashed rgba(120,130,150,0.32)",
              borderRadius: 18,
              background: "rgba(255,255,255,0.35)",
            }}
          >
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: "#1c1f27",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M7 17L17 7M17 7H8M17 7v9" />
              </svg>
            </span>
            <div style={{ font: "700 15px Arial", color: "#16181d" }}>New conversation</div>
            <div
              style={{
                font: "400 13px Arial",
                color: "#9a9ea8",
                maxWidth: 380,
                lineHeight: 1.5,
              }}
            >
              Ask about processes, limits, tests, revenue — or ask to find suppliers on the web.
            </div>
          </div>
        )}

        {turns.length > 0 && totalTokens > 0 ? (
          <p
            style={{
              font: "400 11px Arial",
              color: "#9a9ea8",
              margin: "0 0 16px",
            }}
          >
            Spent (estimate): ≈ {totalTokens} tokens · {Money.of(totalMinor).format()} over{" "}
            {turns.length} request(s)
          </p>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(16px) saturate(1.5)",
            WebkitBackdropFilter: "blur(16px) saturate(1.5)",
            border: "1px solid rgba(255,255,255,0.65)",
            boxShadow: "0 6px 18px rgba(31,45,80,0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
            borderRadius: 30,
            padding: "7px 7px 7px 18px",
          }}
        >
          <input
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void ask(question);
              }
            }}
            placeholder="Ask about processes, limits, tests, revenue…"
            style={{
              flex: 1,
              minWidth: 0,
              font: "400 13px Arial",
              color: "#16181d",
              border: "none",
              background: "transparent",
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => void ask(question)}
            disabled={pending}
            aria-label="Ask"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "none",
              background: "#bf322b",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: pending ? "default" : "pointer",
              opacity: pending ? 0.6 : 1,
              flex: "none",
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 12,
          }}
        >
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              disabled={pending}
              onClick={() => void ask(example)}
              style={{
                border: "1px solid rgba(255,255,255,0.6)",
                background: "rgba(255,255,255,0.55)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                color: "#16181d",
                font: "600 12px Arial",
                padding: "7px 13px",
                borderRadius: 999,
                cursor: pending ? "default" : "pointer",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {example}
            </button>
          ))}
        </div>

        {error ? (
          <p style={{ font: "400 13px Arial", color: "#bf322b", marginTop: 12 }}>{error}</p>
        ) : null}
      </div>
    </div>
  );
}
