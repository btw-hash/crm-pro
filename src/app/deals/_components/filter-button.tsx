/**
 * Glass "Filter" button in the deals-board header — an exact copy of the design
 * reference (reference CRM-PRO.dc.html, p. 1227): border 1px rgba(255,255,255,0.6),
 * background rgba(255,255,255,0.5) + backdrop-blur, font 600 13px Arial,
 * padding 11px 16px, border-radius 24px, funnel SVG, box-shadow with an inner highlight.
 *
 * A presentational component: there's no separate filter panel in CRM Pro yet
 * (sorting/scope is set via the saved-views tabs under the header), so the button
 * visually matches the reference but doesn't wire up a nonexistent backend —
 * business logic isn't invented. The title explains the current status.
 */
export function FilterButton() {
  return (
    <button
      type="button"
      title="Deal filters are coming later — use the views below for now"
      aria-label="Filter"
      style={{
        border: "1px solid rgba(255,255,255,0.6)",
        background: "rgba(255,255,255,0.5)",
        backdropFilter: "blur(14px) saturate(1.4)",
        WebkitBackdropFilter: "blur(14px) saturate(1.4)",
        color: "#16181d",
        font: "600 13px Arial",
        padding: "11px 16px",
        borderRadius: 24,
        display: "flex",
        alignItems: "center",
        gap: 8,
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
        aria-hidden="true"
      >
        <path d="M22 3H2l8 9.46V19l4 2v-8.54z" />
      </svg>
      Filter
    </button>
  );
}
