# UI Navigation Polish — Design Spec
**Date:** 2026-03-20
**Scope:** App interior navigation and information architecture

---

## Overview

Polish the logged-in app interior by extracting a shared `AppHeader` component, adding icons to `AppNav` tabs, replacing the inline sign-out button with a user dropdown, and improving `TripNav` tab contrast. No structural redesign — refinement of the existing dark, bold design language.

---

## Goals

- Eliminate duplicated header code across all app pages
- Replace raw "Sign Out" button in header with a user avatar dropdown (Settings + Sign Out)
- Add icons to `AppNav` tabs (Trips, Templates, Bucket List)
- Improve `TripNav` inactive tab legibility (gray-500 → gray-400)

## Out of Scope

- Landing page and auth pages
- Icons on TripNav sections
- Count badges on TripNav sections
- Any layout or structural redesign

---

## Components

### 1. `AppHeader` (new shared component)

**File:** `src/components/AppHeader.tsx`

A client component that replaces the inline `<header>` block currently duplicated across the 12 pages listed in the Page Updates section. `AppHeader` is placed directly inside each page's JSX as a one-for-one replacement for that page's existing `<header>` element — it is not moved into a layout file.

**Structure:**
```
<header>
  ├── Logo (diamond + "TRIPPLA", links to /trips)
  └── Right side
      ├── LanguageSwitcher (existing component)
      └── UserChip (avatar + name + chevron, toggles dropdown)
              └── Dropdown (absolute positioned)
                  ├── User info section (name + email, non-clickable)
                  ├── Settings link → /settings
                  └── Sign Out (red text, calls signOut)
```

**Behaviour:**
- Dropdown closes on outside click (mousedown listener, same pattern as existing menu in trip detail page)
- Dropdown closes on Escape key
- Tab and arrow-key navigation of dropdown items is out of scope
- UserChip carries `position: relative` so the dropdown is positioned relative to it
- User avatar rendered by the existing `UserAvatar` component at size `sm`

**Styling:**
- Header: `border-b border-white/10 bg-[#0d0d0d] px-4 md:px-8 py-3 md:py-4`
- UserChip (closed): `relative flex items-center gap-2 px-2 py-1.5 border border-white/10 bg-white/[0.04] hover:border-white/20 transition-colors cursor-pointer`
- UserChip (open — complete class string, replaces closed): `relative flex items-center gap-2 px-2 py-1.5 border border-teal-400/[0.4] bg-teal-500/[0.08] transition-colors cursor-pointer`
- Dropdown: `absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-white/[0.12] shadow-2xl z-50` — intentionally sharp-cornered (no border-radius)
- Dropdown structure (top to bottom):
  1. User info block — `px-4 py-3 border-b border-white/[0.06]` — non-interactive, renders name + email
  2. Settings item — `px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-white/5 transition-colors text-gray-300`
  3. Sign Out item — `px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-white/5 transition-colors text-red-400 hover:text-red-300 border-t border-white/[0.06] mt-1` — one visual separator (the border-t) above Sign Out only

---

### 2. `AppNav` — icon addition

**File:** `src/components/AppNav.tsx` (existing, modify in place)

Add an SVG icon to each tab label. Icons sourced from inline SVG (no icon library dependency).

| Tab | Icon (Lucide reference) |
|-----|------------------------|
| Trips | `plane` (Lucide) — a simple airplane silhouette |
| Templates | `layout-template` (Lucide) — grid with header area |
| Bucket List | `star` (Lucide) — five-pointed star outline |

Copy the SVG path data from the corresponding Lucide icon. Do not add the Lucide package as a dependency — inline the SVG.

Icons are 14×14px, `stroke-current`, rendered to the left of the label text. Each tab `<Link>` must have the `group` class added (in addition to its existing classes) so that `group-hover` utilities resolve on child elements. Active tab: icon inherits `text-teal-400`. Inactive tab: icon inherits `text-gray-500 group-hover:text-gray-300`.

No other structural changes to `AppNav`.

---

### 3. `TripNav` — contrast improvement

**File:** `src/components/TripNav.tsx` (existing, modify in place)

Single change: inactive tab text color from `text-gray-500` → `text-gray-400`. Hover state unchanged (`hover:text-gray-300`).

---

## Page Updates

Each page that currently renders an inline `<header>` block gets it replaced with `<AppHeader />`. The existing `LanguageSwitcher`, `UserAvatar`, and inline `signOut` button usages inside those headers are removed (they move into `AppHeader`).

Complete list of pages to update (all confirmed to have an inline `<header>` element):

1. `src/app/[locale]/trips/page.tsx`
2. `src/app/[locale]/trips/[tripId]/page.tsx`
3. `src/app/[locale]/trips/[tripId]/itinerary/page.tsx`
4. `src/app/[locale]/trips/[tripId]/accommodations/page.tsx`
5. `src/app/[locale]/trips/[tripId]/expenses/page.tsx`
6. `src/app/[locale]/trips/[tripId]/transport/page.tsx`
7. `src/app/[locale]/trips/[tripId]/packing/page.tsx`
8. `src/app/[locale]/trips/[tripId]/polls/page.tsx`
9. `src/app/[locale]/trips/[tripId]/stages/page.tsx`
10. `src/app/[locale]/settings/page.tsx`
11. `src/app/[locale]/templates/page.tsx`
12. `src/app/[locale]/bucketlist/page.tsx`

---

## Data Flow

`AppHeader` uses:
- `useSession()` — for user name, email, image
- `signOut` from `next-auth/react`
- `LocaleLink` for Settings and logo links
- `useTranslations()` — all required keys already exist in the translation files:
  - `common.appName` — app name in header
  - `common.signOut` — "Sign Out" label in dropdown
  - `settings.title` — confirmed present, use this key for the Settings link label

No new translation keys need to be added. No new API calls or data fetching needed.

---

## Non-Goals / Constraints

- Do not add count badges to TripNav (requires additional data plumbing)
- Do not change the overall page layout or spacing outside the header/nav
- Do not alter the landing page, auth pages, or legal pages
- Keep existing `LanguageSwitcher` and `UserAvatar` components unchanged

---

## Success Criteria

- All app-interior pages render `AppHeader` — no duplicated header JSX
- Clicking the user chip opens a dropdown with Settings and Sign Out
- Clicking outside the dropdown closes it
- `AppNav` tabs display icons alongside labels
- `TripNav` inactive tabs are visibly more legible than before

