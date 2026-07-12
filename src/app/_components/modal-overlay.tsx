"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Modal window shell: a dimmed overlay + a white card centered on screen. A single
 * source of styles (`.modal-overlay`/`.modal-card` classes, mirrored by `.drawer-overlay`)
 * instead of repeating inline styles in every modal. Clicking the backdrop closes it;
 * clicking inside the card does not.
 *
 * Rendered through a portal into `document.body`: otherwise the modal's `position:fixed`
 * is computed relative to the nearest ancestor with a `transform` (e.g. a sliding mobile
 * sidebar), and the window gets clipped by its width. The portal takes the modal out of
 * such containers — centering is always relative to the viewport.
 */
export function ModalOverlay({
  ariaLabel,
  onClose,
  maxWidth = 480,
  children,
}: {
  readonly ariaLabel: string;
  readonly onClose: () => void;
  readonly maxWidth?: number;
  readonly children: ReactNode;
}) {
  // SSR-safe: document doesn't exist server-side — render null (portal is client-only).
  // Via typeof document (rather than mounted-state) so that in jsdom/tests the portal
  // is created synchronously on the first render, without waiting for an effect.
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="modal-overlay"
      onClick={onClose}
    >
      <div className="modal-card" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
