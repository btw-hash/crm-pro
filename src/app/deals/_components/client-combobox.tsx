"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ClientOption {
  readonly id: string;
  readonly name: string;
}

interface ClientComboboxProps {
  readonly clients: readonly ClientOption[];
  readonly value: string;
  readonly onChange: (clientId: string, clientName: string) => void;
  readonly onNewClient?: (name: string) => void;
}

export function ClientCombobox({ clients, value, onChange, onNewClient }: ClientComboboxProps) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState(() => clients.find((c) => c.id === value)?.name ?? "");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered =
    query.trim() === ""
      ? clients
      : clients.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  const exactMatch = clients.find((c) => c.name.toLowerCase() === query.toLowerCase().trim());
  const showCreateOption = onNewClient && query.trim() && !exactMatch;

  const totalOptions = filtered.length + (showCreateOption ? 1 : 0);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  function selectClient(client: ClientOption) {
    setQuery(client.name);
    onChange(client.id, client.name);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      setHighlighted((h) => Math.min(h + 1, totalOptions - 1));
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      setHighlighted((h) => Math.max(h - 1, 0));
      e.preventDefault();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted < filtered.length) {
        const client = filtered[highlighted];
        if (client) selectClient(client);
      } else if (showCreateOption) {
        onNewClient(query.trim());
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-opt-${highlighted}` : undefined}
        autoComplete="off"
        value={query}
        placeholder="Start typing a name…"
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange("", e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        style={{
          font: "inherit",
          padding: "0.45rem 0.6rem",
          border: "1px solid var(--border)",
          borderRadius: 6,
          background: "#fff",
          color: "var(--fg)",
          width: "100%",
          boxSizing: "border-box",
        }}
      />
      {open && totalOptions > 0 ? (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            zIndex: 100,
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            margin: 0,
            padding: 0,
            listStyle: "none",
            background: "#fff",
            border: "1px solid var(--border)",
            borderRadius: 6,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
            maxHeight: 220,
            overflowY: "auto",
          }}
        >
          {filtered.map((c, i) => (
            <li
              key={c.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={c.id === value}
              onMouseDown={() => selectClient(c)}
              style={{
                padding: "0.45rem 0.7rem",
                cursor: "pointer",
                background: i === highlighted ? "var(--accent-soft, #e8f5fd)" : undefined,
                fontWeight: c.id === value ? 600 : undefined,
              }}
            >
              {c.name}
            </li>
          ))}
          {showCreateOption ? (
            <li
              id={`${listId}-opt-${filtered.length}`}
              role="option"
              aria-selected={false}
              onMouseDown={() => {
                onNewClient(query.trim());
                setOpen(false);
              }}
              style={{
                padding: "0.45rem 0.7rem",
                cursor: "pointer",
                background:
                  highlighted === filtered.length ? "var(--accent-soft, #e8f5fd)" : undefined,
                color: "var(--accent)",
                borderTop: "1px solid var(--border)",
              }}
            >
              + Create client "{query.trim()}"
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
