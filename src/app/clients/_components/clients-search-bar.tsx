"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useTransition } from "react";

const DEBOUNCE_MS = 250;

export function ClientsSearchBar({
  initialValue,
  activeFilter,
}: {
  readonly initialValue: string;
  readonly activeFilter: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("q", value.trim());
      } else {
        params.delete("q");
      }
      if (activeFilter && activeFilter !== "all") {
        params.set("filter", activeFilter);
      } else {
        params.delete("filter");
      }
      startTransition(() => {
        router.replace(`/clients?${params.toString()}`);
      });
    }, DEBOUNCE_MS);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        border: "1px solid rgba(255,255,255,0.6)",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
        padding: "0 14px",
        borderRadius: "24px",
        boxShadow: "0 4px 14px rgba(31,45,80,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6b6f78"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4-4" />
      </svg>
      <input
        type="search"
        defaultValue={initialValue}
        placeholder="Search by name or EIN"
        aria-label="Search by name or EIN"
        onChange={(e) => handleChange(e.target.value)}
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          font: "400 13px Arial",
          color: "#16181d",
          padding: "10px 0",
          width: "208px",
        }}
      />
    </div>
  );
}
