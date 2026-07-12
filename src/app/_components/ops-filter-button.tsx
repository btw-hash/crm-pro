"use client";

/**
 * Glass "Filter" button with a funnel icon (the warm reference-design theme). A
 * client component — it has an interactive onClick (server components can't have
 * one). A presentational anchor for the reference design: the actual filters live
 * in the `OpsFilters` panel further down the page; the click smoothly scrolls to
 * it. No filtering logic of its own.
 */
export function FilterButton() {
  return (
    <button
      type="button"
      title="Filters — below the header"
      onClick={() => {
        if (typeof document === "undefined") return;
        const panel = document.querySelector("[data-ops-filters]");
        panel?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }}
      style={{
        border: "1px solid rgba(255,255,255,0.6)",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
        color: "#16181d",
        font: "600 13px Arial",
        padding: "11px 16px",
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        cursor: "pointer",
        boxShadow: "0 4px 14px rgba(31,45,80,0.08), inset 0 1px 0 rgba(255,255,255,0.7)",
      }}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
      </svg>
      Filter
    </button>
  );
}
