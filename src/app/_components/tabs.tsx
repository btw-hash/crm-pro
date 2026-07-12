"use client";

import { type ReactNode, useState } from "react";

export interface TabItem {
  readonly key: string;
  readonly label: string;
  readonly content: ReactNode;
}

/**
 * Tabs for the 360 card. Content is rendered server-side and passed in — switching
 * happens without a reload. All panels stay mounted (inactive ones are hidden via
 * `hidden`), so client form/composer state is NOT lost. The active panel gets the
 * `.scr` class: on every switch it's reapplied and replays the `scrIn` entrance
 * animation (content smoothly "floats up", without a remount).
 */
export function Tabs({ tabs }: { tabs: readonly TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "");
  return (
    <div>
      <div
        role="tablist"
        style={{
          display: "flex",
          gap: "6px",
          borderBottom: "1px solid #eef0f2",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                font: isActive ? "600 13px Arial" : "500 13px Arial",
                color: isActive ? "#16181d" : "#9a9ea8",
                borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                padding: "0 4px 10px",
                transition: "color .2s, border-bottom-color .2s",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <div
            key={tab.key}
            role="tabpanel"
            hidden={!isActive}
            className={isActive ? "scr" : undefined}
          >
            {tab.content}
          </div>
        );
      })}
    </div>
  );
}
