"use client";

import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/**
 * Screen content wrapper: replays the `scrIn` entrance animation on route change
 * (like `.scr` on every screen in the reference design — content "floats up" on
 * navigation). The key is the pathname (not the full URL string), so a query
 * param change (`?deal=`) doesn't remount the page or flicker when a drawer opens.
 *
 * The router leaves the window where it was when the new screen's top is still in
 * view, so a scrolled page handed its offset to the next one; reset it per screen.
 */
export function ScreenTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="scr" key={pathname}>
      {children}
    </div>
  );
}
