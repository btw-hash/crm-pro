import type { ReactNode } from "react";
import type { SectionVisibility } from "@/domain/deal/deal-stage";
import { CollapsibleStage } from "./collapsible-stage";

/**
 * A deal-card section aware of the stage: future (`locked`) — collapsed into a hint
 * "unlocks at stage…", past (`readonly`) — collapsed into a `<details>` marked
 * "completed" (clicking expands the stage data), current (`active`) — expanded with
 * actions. So at any stage only the current section is expanded, the rest are collapsed.
 */
export function StageSection({
  title,
  visibility,
  unlockLabel,
  children,
}: {
  title: string;
  visibility: SectionVisibility;
  unlockLabel: string;
  children: ReactNode;
}) {
  if (visibility === "locked") {
    return (
      <details>
        <summary className="muted">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9a9ea8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ verticalAlign: "middle", marginInlineEnd: "0.25em" }}
          >
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {title} — unlocks at stage "{unlockLabel}"
        </summary>
      </details>
    );
  }

  if (visibility === "readonly") {
    return <CollapsibleStage title={title}>{children}</CollapsibleStage>;
  }

  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}
