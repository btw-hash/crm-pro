"use client";

import { useSearchParams } from "next/navigation";
import { ViewSwitcher } from "./view-switcher";

const OPTIONS = [
  { value: "4", label: "Last 4 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All time" },
] as const;

/**
 * "View" selector for analytics: controls the revenue trend chart period via
 * `?period=` in the URL (the server page slices byMonth by it). Default — 4 months
 * (the parameter is omitted). Other query params are preserved.
 *
 * Presentation — a dropdown button "View: {label} ▾" (CRM Pro UI reference, pill radius 24),
 * on top of the shared `ViewSwitcher`; all the URL-change logic lives there.
 */
export function PeriodSelect() {
  const searchParams = useSearchParams();
  const current = searchParams.get("period") ?? "4";

  return (
    <ViewSwitcher
      param="period"
      prefix="View: "
      value={current}
      defaultValue="4"
      options={[...OPTIONS]}
      menuMinWidth={200}
    />
  );
}
