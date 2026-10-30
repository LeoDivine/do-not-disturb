"use client";

import { useEffect, useRef } from "react";

/**
 * Global event fired whenever every open overlay (modal, dialog, popover,
 * dropdown menu) should close. Dispatched by GlobalShortcuts on Escape, but
 * can also be dispatched manually via `closeAllOverlays()`.
 */
export const CLOSE_ALL_OVERLAYS_EVENT = "dnd-close-all-overlays";

export function closeAllOverlays() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CLOSE_ALL_OVERLAYS_EVENT));
}

/**
 * Registers an overlay so it closes when Escape is pressed anywhere in the
 * platform (including while focus is inside an input within the overlay).
 */
export function useCloseOnEscape(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = () => onCloseRef.current();
    window.addEventListener(CLOSE_ALL_OVERLAYS_EVENT, handler);
    return () => window.removeEventListener(CLOSE_ALL_OVERLAYS_EVENT, handler);
  }, [isOpen]);
}
