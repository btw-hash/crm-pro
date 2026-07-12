"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { globalSearch } from "./command-palette-actions";
import { type CommandHit, type CommandHitKind, matchingCommands } from "./command-palette-search";

const KIND_LABEL: Record<CommandHitKind, string> = {
  client: "Client",
  deal: "Deal",
  product: "Product",
  command: "Command",
};

/** Trigger button in the header: opens the palette (for discoverability next to Ctrl+K). */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      className="cmdk-trigger"
      onClick={() => window.dispatchEvent(new Event("cmdk:open"))}
    >
      <Search size={15} strokeWidth={2} aria-hidden /> Search
      <kbd className="cmdk-trigger__kbd">Ctrl K</kbd>
    </button>
  );
}

/**
 * Command palette (Ctrl/Cmd+K): global search over clients/deals/catalog +
 * navigation commands. Search runs through a server action with RBAC. Keyboard:
 * arrows + Enter, Esc closes. Mounted in the layout — available on any page.
 */
export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<readonly CommandHit[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("cmdk:open", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cmdk:open", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const trimmed = query.trim();
    const commands = matchingCommands(trimmed);
    if (trimmed === "") {
      setHits(commands);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const entities = await globalSearch(trimmed);
      if (!cancelled) {
        setHits([...entities, ...commands]);
        setActive(0);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  function choose(hit: CommandHit) {
    setOpen(false);
    router.push(hit.href);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="cmdk-overlay" onClick={() => setOpen(false)}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Search across the system"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          className="cmdk__input"
          placeholder="Search: client, deal, product, or command…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (event.key === "Enter") {
              event.preventDefault();
              const hit = hits[active];
              if (hit) {
                choose(hit);
              }
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <ul className="cmdk__list" role="listbox">
          {hits.length === 0 ? (
            <li className="cmdk__empty">{query.trim() ? "Nothing found" : "Start typing…"}</li>
          ) : (
            hits.map((hit, index) => (
              <li
                key={`${hit.kind}:${hit.id}`}
                role="option"
                aria-selected={index === active}
                className={"cmdk__item" + (index === active ? " cmdk__item--active" : "")}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(hit)}
              >
                <span className={`cmdk__kind cmdk__kind--${hit.kind}`}>{KIND_LABEL[hit.kind]}</span>
                <span className="cmdk__label">{hit.label}</span>
                {hit.sublabel ? <span className="cmdk__sub">{hit.sublabel}</span> : null}
              </li>
            ))
          )}
        </ul>
        <div className="cmdk__hint">↑↓ select · ↵ open · esc close</div>
      </div>
    </div>
  );
}
