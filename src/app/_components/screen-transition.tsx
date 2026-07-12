"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Screen content wrapper: replays the `scrIn` entrance animation on route change
 * (like `.scr` on every screen in the reference design — content "floats up" on
 * navigation). The key is the pathname (not the full URL string), so a query
 * param change (`?deal=`) doesn't remount the page or flicker when a drawer opens.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="scr" key={pathname}>
      {children}
    </div>
  );
}
