# Keyboard Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyboard shortcuts (G-then-letter sequences) and arrow key tab navigation to the entire Trippla web app.

**Architecture:** A generic `useKeyboardShortcuts` hook handles all key listening; it is mounted in `AppHeader` (app-level shortcuts) and `TripNav` (trip-level shortcuts). Both nav bars (`AppNav`, `TripNav`) get ARIA roving tabindex so arrow keys move focus between tabs and `Space`/`Enter` navigates. A `KeyboardShortcutsHelp` modal (shown via `?`) lists all shortcuts.

**Tech Stack:** Next.js 14 App Router, TypeScript, next-intl, Tailwind CSS, Vitest + @testing-library/react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/hooks/useKeyboardShortcuts.ts` | **Create** | G-sequence + single-key (`?`, `Escape`) listener hook |
| `src/hooks/useKeyboardShortcuts.test.ts` | **Create** | Unit tests for the hook |
| `src/components/KeyboardShortcutsHelp.tsx` | **Create** | Help modal UI |
| `src/components/ui/modal.tsx` | **Modify** | Add `role="dialog"` and `aria-modal="true"` to inner content div |
| `src/components/AppHeader.tsx` | **Modify** | Mount app-level shortcuts + help modal |
| `src/components/AppNav.tsx` | **Modify** | ARIA roving tabindex + arrow key nav |
| `src/components/TripNav.tsx` | **Modify** | ARIA roving tabindex + arrow key nav + trip shortcuts |

---

## Task 1: useKeyboardShortcuts hook

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Create: `src/hooks/useKeyboardShortcuts.test.ts`

### Background

The hook attaches a `keydown` listener to `window`. It implements two behaviours:

1. **Single-key shortcuts** — `?` and `Escape` fire immediately when pressed. Any key registered in the shortcuts map whose `e.key` value is longer than one character (e.g. `"Escape"`) or is `?` is treated this way.
2. **G-sequence** — pressing `G` (or `g`) starts a 1-second window; the next matching lowercase key fires its handler.

Handlers are stored in a ref so they always call the latest version without re-running the effect.
Skips all handling when `document.activeElement` is an `input`, `textarea`, `select`, or contenteditable element.
On unmount, removes the listener and clears any pending timeout.

- [ ] **Step 1: Write failing tests**

Create `src/hooks/useKeyboardShortcuts.test.ts`:

```ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

function fireKey(key: string) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires handler after G then matching key", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    fireKey("t");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not fire if G timeout expires before second key", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    vi.advanceTimersByTime(1001);
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
  });

  it("fires ? handler immediately without G prefix", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ "?": handler }));
    fireKey("?");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("fires Escape handler immediately without G prefix", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ Escape: handler }));
    fireKey("Escape");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("skips handler when focus is in an input", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("skips handler when focus is in a textarea", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    textarea.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("skips handler when focus is in a select", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const select = document.createElement("select");
    document.body.appendChild(select);
    select.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(select);
  });

  it("skips handler when focus is in a contenteditable element", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    const div = document.createElement("div");
    div.contentEditable = "true";
    document.body.appendChild(div);
    div.focus();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(div);
  });

  it("removes listener on unmount", () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ t: handler }));
    unmount();
    fireKey("g");
    fireKey("t");
    expect(handler).not.toHaveBeenCalled();
  });

  it("treats G and g as the same trigger", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("G");
    fireKey("t");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("is case-insensitive for the second key", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    fireKey("T");
    expect(handler).toHaveBeenCalledOnce();
  });

  it("resets after unregistered second key and accepts a fresh G-sequence", () => {
    const handler = vi.fn();
    renderHook(() => useKeyboardShortcuts({ t: handler }));
    fireKey("g");
    fireKey("z"); // unrecognised — resets the pending state
    fireKey("t"); // no pending G, should NOT fire
    expect(handler).not.toHaveBeenCalled();
    // A fresh G-sequence SHOULD fire
    fireKey("g");
    fireKey("t");
    expect(handler).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run tests — expect all to fail**

```bash
cd /home/tobias/trippla && npx vitest run src/hooks/useKeyboardShortcuts.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Implement the hook**

Create `src/hooks/useKeyboardShortcuts.ts`:

```ts
"use client";

import { useEffect, useRef } from "react";

// Single-key shortcuts: keys whose e.key value is longer than 1 char (e.g. "Escape")
// or is exactly "?" are fired immediately without a G prefix.
const SINGLE_KEY_SHORTCUTS = new Set(["?", "Escape"]);

function isInFormField(el: Element | null): boolean {
  if (!el) return false;
  const tag = (el as HTMLElement).tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
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
```

- [ ] **Step 4: Run tests — expect all to pass**

```bash
cd /home/tobias/trippla && npx vitest run src/hooks/useKeyboardShortcuts.test.ts
```

Expected: 12/12 PASS (1 describe block, 12 it() calls)

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/hooks/useKeyboardShortcuts.test.ts
git commit -m "feat: add useKeyboardShortcuts hook with G-sequence and single-key support"
```

---

## Task 2: KeyboardShortcutsHelp modal + Modal accessibility fix

**Files:**
- Modify: `src/components/ui/modal.tsx`
- Create: `src/components/KeyboardShortcutsHelp.tsx`

The existing `Modal` component renders its inner content div without `role="dialog"` or `aria-modal="true"`, which means screen readers do not announce it as a dialog. Fix this first (it benefits all modals in the app), then build `KeyboardShortcutsHelp` on top of it.

- [ ] **Step 1: Read modal.tsx**

```bash
cat src/components/ui/modal.tsx
```

The inner content div is the second `<div>` inside the backdrop — the one with `onClick={(e) => e.stopPropagation()}`.

- [ ] **Step 2: Add dialog ARIA to Modal inner div**

In `src/components/ui/modal.tsx`, change the inner content `<div>` from:
```tsx
<div
  className={`bg-[#1a1a1a] border border-white/20 ${maxWidth} w-full flex flex-col max-h-[90vh]`}
  onClick={(e) => e.stopPropagation()}
>
```
to:
```tsx
<div
  role="dialog"
  aria-modal="true"
  className={`bg-[#1a1a1a] border border-white/20 ${maxWidth} w-full flex flex-col max-h-[90vh]`}
  onClick={(e) => e.stopPropagation()}
>
```

- [ ] **Step 3: Create KeyboardShortcutsHelp**

Create `src/components/KeyboardShortcutsHelp.tsx`:

```tsx
"use client";

import { Modal } from "@/components/ui/modal";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  tripId?: string | null;
}

const APP_SHORTCUTS = [
  { keys: ["G", "T"], description: "Go to Trips" },
  { keys: ["G", "M"], description: "Go to Templates" },
  { keys: ["G", "B"], description: "Go to Bucket List" },
  { keys: ["?"], description: "Show / hide this help" },
];

const TRIP_SHORTCUTS = [
  { keys: ["G", "O"], description: "Overview" },
  { keys: ["G", "I"], description: "Itinerary" },
  { keys: ["G", "A"], description: "Accommodations" },
  { keys: ["G", "X"], description: "Expenses" },
  { keys: ["G", "R"], description: "Transport" },
  { keys: ["G", "P"], description: "Packing" },
  { keys: ["G", "L"], description: "Polls" },
  { keys: ["G", "S"], description: "Stages" },
];

function ShortcutRow({ keys, description }: { keys: string[]; description: string }) {
  return (
    <tr>
      <td className="py-1.5 pr-6 whitespace-nowrap">
        {keys.map((k, i) => (
          <span key={i}>
            {i > 0 && <span className="text-gray-600 text-xs mx-1">then</span>}
            <kbd className="inline-block px-1.5 py-0.5 text-xs font-mono bg-white/10 border border-white/20 text-gray-300">
              {k}
            </kbd>
          </span>
        ))}
      </td>
      <td className="py-1.5 text-sm text-gray-400">{description}</td>
    </tr>
  );
}

export function KeyboardShortcutsHelp({ open, onClose, tripId }: KeyboardShortcutsHelpProps) {
  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-sm">
      <Modal.Header>
        <h2 className="text-sm font-bold uppercase tracking-widest text-white">Keyboard Shortcuts</h2>
      </Modal.Header>
      <Modal.Body>
        <div className="space-y-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">Navigation</p>
            <table className="w-full">
              <tbody>
                {APP_SHORTCUTS.map((s) => (
                  <ShortcutRow key={s.description} {...s} />
                ))}
              </tbody>
            </table>
          </div>
          {tripId && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3">This Trip</p>
              <table className="w-full">
                <tbody>
                  {TRIP_SHORTCUTS.map((s) => (
                    <ShortcutRow key={s.description} {...s} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal.Body>
    </Modal>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/modal.tsx src/components/KeyboardShortcutsHelp.tsx
git commit -m "feat: add KeyboardShortcutsHelp modal; add dialog ARIA to Modal component"
```

---

## Task 3: App-level shortcuts in AppHeader

**Files:**
- Modify: `src/components/AppHeader.tsx`

Mount app-level shortcuts (`G→T`, `G→M`, `G→B`, `?`, `Escape`) and render the help modal.
`AppHeader` already uses `useState`, `useEffect`, `useRef` — just add more hooks.
Use `useParams()` from `next/navigation` to detect `tripId` for the help modal's trip section.

The `Escape` shortcut closes the help modal. Note: the existing `useEffect` in AppHeader already handles `Escape` for the **user dropdown** (it only runs when `open` is true). That handler is separate and still needed — the new `useKeyboardShortcuts` `Escape` handler only closes the help modal.

- [ ] **Step 1: Read the current file**

```bash
cat src/components/AppHeader.tsx
```

- [ ] **Step 2: Add imports**

Add after the existing import block:

```ts
import { useParams, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";
```

- [ ] **Step 3: Add hook calls inside the component function**

Add these after the existing `const [open, setOpen] = useState(false);` line:

```ts
const router = useRouter();
const locale = useLocale();
const params = useParams();
const tripId = typeof params?.tripId === "string" ? params.tripId : null;
const [showHelp, setShowHelp] = useState(false);

useKeyboardShortcuts({
  t: () => router.push(`/${locale}/trips`),
  m: () => router.push(`/${locale}/templates`),
  b: () => router.push(`/${locale}/bucketlist`),
  "?": () => setShowHelp((v) => !v),
  Escape: () => setShowHelp(false),
});
```

- [ ] **Step 4: Render the help modal**

Add this just before the closing `</header>` tag:

```tsx
<KeyboardShortcutsHelp
  open={showHelp}
  onClose={() => setShowHelp(false)}
  tripId={tripId}
/>
```

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`) and visit any page. Press:
- `G` then `T` → navigates to Trips
- `G` then `M` → navigates to Templates
- `G` then `B` → navigates to Bucket List
- `?` → help modal opens; press `?` again to toggle close; press `Escape` to dismiss
- Click outside the modal → modal closes
- Visit a trip page, press `?` → modal shows "This Trip" section

- [ ] **Step 6: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "feat: mount app-level keyboard shortcuts in AppHeader"
```

---

## Task 4: Roving tabindex in AppNav

**Files:**
- Modify: `src/components/AppNav.tsx`

Add ARIA attributes and arrow key handling to the top-level nav bar (Trips / Templates / Bucketlist).
The existing `data-active="true"` attribute is kept — do not remove it, as the `scrollIntoView` query depends on it.

- [ ] **Step 1: Read the current file**

```bash
cat src/components/AppNav.tsx
```

The file renders a `<nav ref={navRef}>` containing a flex div with `<Link>` elements. The active link has `data-active={isActive}`. The `useEffect` queries `[data-active="true"]` for scrolling.

- [ ] **Step 2: Add router import**

Add to the existing imports:

```ts
import { useRouter } from "next/navigation";
```

(Do not import `useLocale` — AppNav does not need it.)

- [ ] **Step 3: Add router and keydown handler inside the component**

Add after the existing state declarations:

```ts
const router = useRouter();

function handleNavKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const tabs = Array.from(
    navRef.current?.querySelectorAll('[role="tab"]') ?? []
  ) as HTMLElement[];
  const idx = tabs.indexOf(document.activeElement as HTMLElement);
  if (idx === -1) return;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    tabs[(idx + 1) % tabs.length].focus();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    tabs[(idx - 1 + tabs.length) % tabs.length].focus();
  } else if (e.key === "Home") {
    e.preventDefault();
    tabs[0].focus();
  } else if (e.key === "End") {
    e.preventDefault();
    tabs[tabs.length - 1].focus();
  } else if (e.key === " ") {
    e.preventDefault();
    // Use getAttribute("href") — not the .href property — to get the relative path
    const href = (document.activeElement as HTMLAnchorElement)?.getAttribute("href");
    if (href) router.push(href);
  }
}
```

- [ ] **Step 4: Update the nav JSX**

Change the `<nav>` opening tag from:
```tsx
<nav ref={navRef} className="overflow-x-auto scrollbar-hide">
```
to:
```tsx
<nav ref={navRef} className="overflow-x-auto scrollbar-hide" role="tablist" aria-label="Main navigation" onKeyDown={handleNavKeyDown}>
```

- [ ] **Step 5: Update each Link**

Change each `<Link>` inside the map. Add ARIA attributes, `tabIndex`, and `focus-visible` ring. Keep `data-active`:

```tsx
<Link
  key={tab.key}
  href={tab.href}
  data-active={isActive}
  role="tab"
  aria-selected={isActive}
  tabIndex={isActive ? 0 : -1}
  className={`group px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 focus-visible:outline-offset-[-2px] ${
    isActive
      ? "border-teal-400 text-teal-400"
      : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20"
  }`}
>
```

- [ ] **Step 6: Manual verification**

Visit any app page. Tab to the nav bar — the active tab should receive focus. Press `ArrowRight`/`ArrowLeft` to move focus (teal outline ring appears). Press `Enter` or `Space` to navigate to the focused tab.

- [ ] **Step 7: Commit**

```bash
git add src/components/AppNav.tsx
git commit -m "feat: add ARIA roving tabindex and arrow key nav to AppNav"
```

---

## Task 5: Roving tabindex + trip shortcuts in TripNav

**Files:**
- Modify: `src/components/TripNav.tsx`

Same roving tabindex pattern as Task 4, plus mount trip-level keyboard shortcuts.
`TripNav` already receives `tripId` as a prop — use it directly.

- [ ] **Step 1: Read the current file**

```bash
cat src/components/TripNav.tsx
```

The file renders a `<nav ref={navRef}>` with `<Link>` elements. It receives `tripId`, `currentSection`, and `unseenSections` props.

- [ ] **Step 2: Add imports**

Add to the existing imports:

```ts
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
```

- [ ] **Step 3: Add hooks and handlers inside the component**

Add after the existing state declarations:

```ts
const router = useRouter();
const locale = useLocale();

useKeyboardShortcuts({
  o: () => router.push(`/${locale}/trips/${tripId}`),
  i: () => router.push(`/${locale}/trips/${tripId}/itinerary`),
  a: () => router.push(`/${locale}/trips/${tripId}/accommodations`),
  x: () => router.push(`/${locale}/trips/${tripId}/expenses`),
  r: () => router.push(`/${locale}/trips/${tripId}/transport`),
  p: () => router.push(`/${locale}/trips/${tripId}/packing`),
  l: () => router.push(`/${locale}/trips/${tripId}/polls`),
  s: () => router.push(`/${locale}/trips/${tripId}/stages`),
});

function handleNavKeyDown(e: React.KeyboardEvent<HTMLElement>) {
  const tabs = Array.from(
    navRef.current?.querySelectorAll('[role="tab"]') ?? []
  ) as HTMLElement[];
  const idx = tabs.indexOf(document.activeElement as HTMLElement);
  if (idx === -1) return;

  if (e.key === "ArrowRight") {
    e.preventDefault();
    tabs[(idx + 1) % tabs.length].focus();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    tabs[(idx - 1 + tabs.length) % tabs.length].focus();
  } else if (e.key === "Home") {
    e.preventDefault();
    tabs[0].focus();
  } else if (e.key === "End") {
    e.preventDefault();
    tabs[tabs.length - 1].focus();
  } else if (e.key === " ") {
    e.preventDefault();
    // Use getAttribute("href") — not the .href property — to get the relative path
    const href = (document.activeElement as HTMLAnchorElement)?.getAttribute("href");
    if (href) router.push(href);
  }
}
```

- [ ] **Step 4: Update the nav JSX**

Change `<nav ref={navRef} className="overflow-x-auto scrollbar-hide">` to:

```tsx
<nav ref={navRef} className="overflow-x-auto scrollbar-hide" role="tablist" aria-label="Trip navigation" onKeyDown={handleNavKeyDown}>
```

- [ ] **Step 5: Update each Link**

Change each `<Link>` in the SECTIONS map.

**Note on href:** TripNav uses `LocaleLink` (imported as `Link`) which automatically prepends the current locale to the path. The href `/trips/${tripId}${section.href}` is correct — do not add a locale prefix manually here. Add ARIA attributes, `tabIndex`, and `focus-visible` ring. Keep `data-active`:

```tsx
<Link
  key={section.key}
  href={`/trips/${tripId}${section.href}`}
  data-active={isActive}
  role="tab"
  aria-selected={isActive}
  tabIndex={isActive ? 0 : -1}
  className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 focus-visible:outline-offset-[-2px] ${
    isActive
      ? "border-teal-400 text-teal-400"
      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-white/20"
  }`}
>
```

- [ ] **Step 6: Manual verification**

Visit a trip page. Test:
- `G` then `P` → navigates to Packing
- `G` then `I` → navigates to Itinerary
- `G` then `O` → navigates to Overview
- Tab to TripNav → arrow keys move focus with teal ring
- `Enter` or `Space` on focused tab → navigates
- `?` → help modal shows "This Trip" section with all 8 trip shortcuts

- [ ] **Step 7: Run all tests**

```bash
cd /home/tobias/trippla && npx vitest run
```

Expected: all 12 hook tests pass, 0 failures

- [ ] **Step 8: Commit**

```bash
git add src/components/TripNav.tsx
git commit -m "feat: add ARIA roving tabindex and trip keyboard shortcuts to TripNav"
```
