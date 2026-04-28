# Sidebar Navigation Design

**Date:** 2026-04-28
**Status:** Approved

## Goal

Replace the horizontal scrollable tab navigation (`AppNav` and `TripNav`) with a collapsible sidebar. On desktop the sidebar collapses to an icon-only strip. On mobile it hides entirely behind a hamburger button.

## Approach

Option B — shared `Sidebar` component. `AppNav` and `TripNav` become thin wrappers that pass their items to a single `<Sidebar>` component that owns all collapse/overlay/mobile logic. The `AppHeader` and overall vertical layout are preserved (Option C — moving logo/user menu into the sidebar — is deferred).

## Component API

```ts
type SidebarItem = {
  key: string
  href: string
  icon: ReactNode
  label: string
  badge?: boolean  // unseen-activity dot (TripNav only)
}

<Sidebar
  items={SidebarItem[]}
  current={string}
  ariaLabel={string}
/>
```

`Sidebar` owns: open/closed state, click-outside close, mobile detection, keyboard navigation (ArrowUp/Down, Home, End, Space).

## Visual States

### Desktop — collapsed (default)
- `position: fixed`, `w-14` (56px), `top-14`, `left-0`, `bottom-0`
- Icons centered, no labels
- Toggle button (hamburger/chevron) at the top
- Unseen dot renders as a badge on the icon's top-right corner

### Desktop — expanded (overlay)
- Widens to `w-56` (224px), slides over content (content does NOT shift)
- Icon + label per row, active item has teal left border
- Dim backdrop (`bg-black/40`) behind sidebar
- Closes on: toggle click, backdrop click, Escape key

### Mobile (below `sm` breakpoint)
- Icon strip hidden entirely
- Hamburger button rendered inside `AppHeader` (between logo and user menu)
- Tap opens full-width overlay with icons + labels
- Same backdrop + close behaviour as desktop expanded

## Layout Changes

- `AppHeader` gets `h-14` fixed height so sidebar can use `top-14`
- All 11 pages using a nav add `sm:pl-14` to their root div (3 app-level + 8 trip subpages)
- Sidebar is `position: fixed` — content does not reflow on expand

## Icons

### TripNav
| Section | Icon |
|---|---|
| overview | `LayoutDashboard` |
| itinerary | `Calendar` |
| accommodations | `BedDouble` |
| expenses | `Wallet` |
| transport | `Plane` |
| packing | `Package` |
| polls | `Vote` |
| stages | `Map` |

### AppNav
Unchanged: `Plane`, `LayoutTemplate`, `Star`

## Keyboard Navigation

Arrow keys updated from Left/Right → Up/Down for vertical list. Home, End, and Space (activate) unchanged.

## Out of Scope

- Moving logo/user menu into sidebar (Option C — future work)
- Sidebar persistence across sessions (no localStorage for open/closed state)
