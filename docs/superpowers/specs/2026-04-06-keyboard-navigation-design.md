# Keyboard Navigation Design

## Goal

Add keyboard shortcuts (two-key `G` sequences) and arrow key navigation in the tab bars across the entire Trippla web app.

## Architecture

**New files:**
- `src/hooks/useKeyboardShortcuts.ts` — generic hook for two-key `G`-sequence shortcuts
- `src/components/KeyboardShortcutsHelp.tsx` — modal listing all shortcuts, shown via `?`

**Modified files:**
- `src/components/AppHeader.tsx` — mounts app-level shortcuts and the `?` help trigger; reads `useParams()` to detect whether the user is inside a trip
- `src/components/AppNav.tsx` — ARIA roving tabindex + ← → arrow key navigation
- `src/components/TripNav.tsx` — ARIA roving tabindex + ← → arrow key navigation + trip-level shortcuts

## useKeyboardShortcuts Hook

```ts
useKeyboardShortcuts(shortcuts: Record<string, () => void>): void
```

- Attaches a `keydown` listener to `window`
- Implements a two-key sequence: pressing `G` opens a 1-second window; a subsequent matching key fires the handler, calls `e.stopPropagation()`, and resets
- If no matching key follows within 1 second, the timeout is cleared and the state resets silently
- The `?` key is matched using `e.key === '?'`, which works correctly on US-QWERTY (`Shift+/`) and most Western keyboard layouts. On non-QWERTY or non-Latin keyboards where `?` is not a single keypress, this shortcut will not fire — this limitation is accepted for a desktop-focused app. The key fires its handler and calls `e.stopPropagation()` immediately (no two-key sequence)
- Skips all handling when focus is inside an `input`, `textarea`, `select`, or `[contenteditable]` element (intentionally limited to standard HTML form elements; can be extended later if needed)
- On unmount, the `keydown` listener and any pending timeout are both cleaned up

**Event propagation:** All consumed events call `e.stopPropagation()` so they do not reach other `keydown` listeners (e.g. the existing `Escape` handler in `AppHeader`). Unconsumed events (unrecognised keys) are not stopped.

**Browser shortcut safety:** The `G`-then-letter sequences are single unmodified keypresses with a deliberate pause between them. Browsers do not intercept unmodified sequential keypresses in this pattern. `G` → `T` specifically does not conflict with `Ctrl+T` (new tab) since no modifier is involved.

## Shortcut Map

### App-level (mounted in AppHeader, always active)

| Keys | Destination |
|------|-------------|
| `G` → `T` | `/trips` (T for Trips) |
| `G` → `M` | `/templates` (M for teMplates) |
| `G` → `B` | `/bucketlist` (B for Bucketlist) |
| `?` | Toggle shortcuts help modal (open if closed, close if open) |

### Trip-level (mounted in TripNav, active when inside a trip)

| Keys | Destination |
|------|-------------|
| `G` → `O` | Trip overview |
| `G` → `I` | Itinerary |
| `G` → `A` | Accommodations |
| `G` → `X` | eXpenses |
| `G` → `R` | tRansport |
| `G` → `P` | Packing |
| `G` → `L` | poLls |
| `G` → `S` | Stages |

Navigation uses Next.js router (`useRouter().push()`). App-level shortcuts use `useLocale()` to construct locale-prefixed paths (e.g. `/en/trips`). Trip-level shortcuts use the `tripId` prop already passed to `TripNav`.

## Obtaining tripId in AppHeader

`AppHeader` calls `useParams()` (Next.js App Router client hook) to read the current URL parameters. If `params.tripId` is a non-empty string, the user is inside a trip. This is used exclusively for the `KeyboardShortcutsHelp` modal to decide whether to render the trip shortcuts section. `TripNav` uses its existing `tripId` prop (not `useParams()`) to register the trip-level shortcuts — this duality is intentional: `TripNav` owns shortcut registration, `AppHeader` owns the help display. Both correctly reflect the same URL state.

## ARIA Roving Tabindex (AppNav + TripNav)

Both nav bars adopt the [ARIA tab pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/):

- `<nav>` gets `role="tablist"`
- Each `<Link>` gets `role="tab"`, `aria-selected={isActive}`, and `tabIndex={isActive ? 0 : -1}`
- The existing `data-active="true"` attribute is retained alongside `aria-selected` so the current `scrollIntoView` logic (which queries `[data-active="true"]`) continues to work unchanged
- `onKeyDown` is attached to the `<nav>` element (the same element that receives `role="tablist"`)
- Key handlers:
  - `ArrowLeft` — move focus to the previous tab (wraps around)
  - `ArrowRight` — move focus to the next tab (wraps around)
  - `Home` — move focus to the first tab
  - `End` — move focus to the last tab
- Arrow keys **move focus only**; they do not navigate. This follows the ARIA specification and allows the user to scan tabs without triggering page navigation.
- `Space` on a focused tab triggers navigation (calls `router.push()`). `Enter` is handled natively by the browser since each tab is an `<a>` element — no explicit `Enter` handler is needed.

**Focus indicator:** Focused (non-active) tabs must be visually distinguishable. Add a `focus-visible:` ring using the existing teal colour (`focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400`) to each tab link. This matches the active indicator style and makes keyboard focus visible after arrow, `Home`, or `End` key navigation.

## KeyboardShortcutsHelp Modal

- Triggered by `?` key (handled in `AppHeader`)
- Pressing `?` again while the modal is open closes it (toggle behaviour)
- Renders using the existing `Modal` component
- Two sections: **Navigation** (app shortcuts, always shown) and **This trip** (trip shortcuts, shown only when `useParams().tripId` is present in `AppHeader`)
- Dismisses with `Escape`, clicking outside, or pressing `?` again
- Layout: two-column table of key → description, one section per group

## Behaviour When Help Modal Is Open

If the help modal is open and the user presses a `G`-sequence shortcut, the shortcut fires normally (navigates via `router.push()`). The modal closes as a side effect because navigation unmounts the component tree. No special handling is needed.

## What's Not Included

- Pressing `Tab` from within the nav bar moves focus out of the nav entirely (to the next focusable element on the page). This is the correct ARIA tab pattern behaviour and is intentional — it is not a bug.
- No keyboard nav inside modals beyond what the browser provides natively (Tab/Shift+Tab)
- No shortcut for creating trips, adding items, or other actions — navigation only
- No persistence of shortcut preferences
