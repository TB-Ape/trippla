"use client";

import { useEffect, useRef } from "react";

// Keys dispatched immediately on press, bypassing the G-sequence.
const SINGLE_KEY_SHORTCUTS = new Set(["?", "Escape"]);

function isInFormField(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  // isContentEditable is correct in real browsers; getAttribute fallback covers jsdom
  // which does not always reflect the IDL property correctly.
  if ((el as HTMLElement).isContentEditable || el.getAttribute("contenteditable") === "true") return true;
  return false;
}

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>): void {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    let pendingG = false;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function reset() {
      pendingG = false;
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isInFormField(document.activeElement)) return;

      const key = e.key;

      // Single-key shortcuts fire immediately (no G prefix needed)
      if (SINGLE_KEY_SHORTCUTS.has(key)) {
        const handler = shortcutsRef.current[key];
        if (handler) {
          e.stopPropagation();
          handler();
        }
        return;
      }

      // Start G-sequence
      if (key === "g" || key === "G") {
        reset();
        pendingG = true;
        timeout = setTimeout(reset, 1000);
        return;
      }

      // Complete G-sequence
      if (pendingG) {
        const handler = shortcutsRef.current[key.toLowerCase()];
        reset();
        if (handler) {
          e.stopPropagation();
          handler();
        }
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeout) clearTimeout(timeout);
    };
  }, []);
}
