# UI Navigation Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract a shared `AppHeader` component, add icons to `AppNav` tabs, add a user dropdown to the header, and improve `TripNav` tab contrast across all 12 app-interior pages.

**Architecture:** A single `AppHeader` component with two rendering modes controlled by an optional `backHref` prop — full mode (logo + user dropdown) for top-level pages, and back-link mode (logo + back link) for trip section sub-pages. `AppNav` and `TripNav` are modified in place.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS v4, next-auth, next-intl, lucide-react (already installed)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| **Create** | `src/components/AppHeader.tsx` | Shared header — full mode + back-link mode |
| **Modify** | `src/components/AppNav.tsx` | Add icons + `group` class to tab links |
| **Modify** | `src/components/TripNav.tsx` | `text-gray-500` → `text-gray-400` on inactive tabs |
| **Modify** | `src/app/[locale]/trips/page.tsx` | Replace inline `<header>` with `<AppHeader />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/page.tsx` | Replace inline `<header>` with `<AppHeader backHref="/trips" />` |
| **Modify** | `src/app/[locale]/settings/page.tsx` | Replace inline `<header>` with `<AppHeader />` |
| **Modify** | `src/app/[locale]/templates/page.tsx` | Replace inline `<header>` with `<AppHeader />` |
| **Modify** | `src/app/[locale]/bucketlist/page.tsx` | Replace inline `<header>` with `<AppHeader />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/itinerary/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/accommodations/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/expenses/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/transport/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/packing/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/polls/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |
| **Modify** | `src/app/[locale]/trips/[tripId]/stages/page.tsx` | Replace inline `<header>` with `<AppHeader backHref=... />` |

---

## Task 1: Create `AppHeader` component

**Files:**
- Create: `src/components/AppHeader.tsx`

The component renders two modes:
- **Full mode** (no `backHref`): logo + language switcher + user chip with dropdown (Settings + Sign Out)
- **Back-link mode** (`backHref` provided): logo + back link (used on trip section sub-pages)

The dropdown state and outside-click pattern match the existing pattern in `src/app/[locale]/trips/[tripId]/page.tsx` (search for `menuRef` and `handleClickOutside`).

- [ ] **Step 1: Create the file**

```tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { UserAvatar } from "@/components/UserAvatar";

interface AppHeaderProps {
  /** When provided, renders back-link mode instead of user dropdown */
  backHref?: string;
  /** Label for the back link. Defaults to ← Back */
  backLabel?: string;
}

export function AppHeader({ backHref, backLabel }: AppHeaderProps) {
  const t = useTranslations();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <header className="border-b border-white/10 bg-[#0d0d0d] px-4 md:px-8 py-3 md:py-4">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link href="/trips" className="flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45" />
          <span className="text-xl md:text-2xl font-bold tracking-tight">{t("common.appName")}</span>
        </Link>

        {/* Right side */}
        {backHref ? (
          /* Back-link mode */
          <Link
            href={backHref}
            className="px-3 md:px-6 py-2 border border-white/20 hover:bg-white/5 transition-colors uppercase text-xs md:text-sm tracking-wider"
          >
            {backLabel ?? `← ${t("tripDetail.backToTrip")}`}
          </Link>
        ) : (
          /* Full mode */
          <div className="flex items-center gap-2 md:gap-4">
            <LanguageSwitcher />
            {/* User chip + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-2 px-2 py-1.5 border transition-colors cursor-pointer ${
                  open
                    ? "border-teal-400/[0.4] bg-teal-500/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/20"
                }`}
              >
                <UserAvatar
                  name={session?.user?.name ?? null}
                  email={session?.user?.email ?? ""}
                  image={session?.user?.image ?? null}
                  size="sm"
                />
                <span className="hidden sm:inline text-sm text-gray-300 font-medium">
                  {session?.user?.name}
                </span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-white/[0.12] shadow-2xl z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-bold text-white truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{session?.user?.email}</p>
                  </div>
                  {/* Settings */}
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-white/5 transition-colors text-gray-300 w-full"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    {t("settings.title")}
                  </Link>
                  {/* Sign Out */}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-white/5 transition-colors text-red-400 hover:text-red-300 border-t border-white/[0.06] mt-1 w-full"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    {t("common.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /home/tobias/trippla && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors in `AppHeader.tsx`. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

```bash
cd /home/tobias/trippla
git add src/components/AppHeader.tsx
git commit -m "feat: add shared AppHeader component with user dropdown"
```

---

## Task 2: Update `AppNav` — add icons and `group` class

**Files:**
- Modify: `src/components/AppNav.tsx`

Add a `group` class to each tab `<Link>` so that `group-hover` utilities work on child elements. Add a Lucide icon to the left of each tab label. `lucide-react` is already in `package.json` — no install needed. (The design spec said to inline SVG, but that was written before discovering the library was available. Using the installed package is correct here.)

Icon mapping:
- `trips` → `<Plane />` from lucide-react
- `templates` → `<LayoutTemplate />` from lucide-react
- `bucketlist` → `<Star />` from lucide-react

- [ ] **Step 1: Open `src/components/AppNav.tsx` and make these changes**

At the top of the file, add the import:
```tsx
import { Plane, LayoutTemplate, Star } from "lucide-react";
```

At the top of the file also add (use named import to avoid relying on global React):
```tsx
import type { ReactNode } from "react";
```

Update the `TABS` array to include icons:
```tsx
const TABS: { key: AppSection; href: string; icon: ReactNode }[] = [
  { key: "trips", href: "/trips", icon: <Plane size={14} /> },
  { key: "templates", href: "/templates", icon: <LayoutTemplate size={14} /> },
  { key: "bucketlist", href: "/bucketlist", icon: <Star size={14} /> },
];
```

Update the `<Link>` inside the map — add `group` class and render the icon:
```tsx
<Link
  key={tab.key}
  href={tab.href}
  data-active={isActive}
  className={`group px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
    isActive
      ? "border-teal-400 text-teal-400"
      : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20"
  }`}
>
  <span className={isActive ? "text-teal-400" : "text-gray-500 group-hover:text-gray-300 transition-colors"}>
    {tab.icon}
  </span>
  {labels[tab.key]}
</Link>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/tobias/trippla
git add src/components/AppNav.tsx
git commit -m "feat: add icons to AppNav tabs"
```

---

## Task 3: Update `TripNav` — improve inactive tab contrast

**Files:**
- Modify: `src/components/TripNav.tsx`

Single class change: `text-gray-500` → `text-gray-400` on the inactive tab. The hover state (`hover:text-gray-300`) stays the same.

- [ ] **Step 1: Make the change**

In `src/components/TripNav.tsx`, find the className string for the inactive tab state (line ~63):
```tsx
// Before:
"border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20"

// After:
"border-transparent text-gray-400 hover:text-gray-300 hover:border-white/20"
```

- [ ] **Step 2: Commit**

```bash
cd /home/tobias/trippla
git add src/components/TripNav.tsx
git commit -m "style: improve TripNav inactive tab contrast"
```

---

## Task 4: Replace headers in top-level app pages

**Full-mode `AppHeader` (no `backHref`) — 4 pages:**
- Modify: `src/app/[locale]/trips/page.tsx`
- Modify: `src/app/[locale]/settings/page.tsx`
- Modify: `src/app/[locale]/templates/page.tsx`
- Modify: `src/app/[locale]/bucketlist/page.tsx`

**Back-link mode `AppHeader` — 1 page:**
- Modify: `src/app/[locale]/trips/[tripId]/page.tsx` — uses `<AppHeader backHref="/trips" />` because its current header already shows logo + "← Back" link (no user dropdown)

For each file:
1. Add `import { AppHeader } from "@/components/AppHeader";` at the top
2. Remove imports now handled by `AppHeader`: `LanguageSwitcher`, `UserAvatar`, `signOut` — but only if they are not used elsewhere in the file. The `session` object (from `useSession`) is used in page body content, so keep `useSession` — only remove `signOut` and the avatar/language imports.
3. Replace the entire `<header>...</header>` block with the appropriate `<AppHeader />` call.

- [ ] **Step 1: Update `trips/page.tsx`**

In `src/app/[locale]/trips/page.tsx`:

Add import:
```tsx
import { AppHeader } from "@/components/AppHeader";
```

Remove (not used elsewhere in the file):
```tsx
import { LanguageSwitcher } from "@/components/LanguageSwitcher";  // remove
import { UserAvatar } from "@/components/UserAvatar";               // remove
// Change: import { useSession, signOut } from "next-auth/react"
// To:     import { useSession } from "next-auth/react"
```

Replace `<header>...</header>` with:
```tsx
<AppHeader />
```

- [ ] **Step 2: Update `trips/[tripId]/page.tsx`**

This page's `<header>` block (lines ~518–534) contains logo + language switcher + "← Back" link. It does **not** contain the 3-dot menu — that lives inside the `PageTransition` content div below `</header>` and is untouched. Safely replace only `<header>...</header>` with:
```tsx
<AppHeader backHref="/trips" />
```

Remove `LanguageSwitcher` import if it is no longer referenced elsewhere in the file (search the file for other uses). Keep `useSession` — the session is used throughout the page body.

- [ ] **Step 3: Update `settings/page.tsx`, `templates/page.tsx`, `bucketlist/page.tsx`**

Apply the same full-mode pattern to each: add `AppHeader` import, remove now-unused `LanguageSwitcher`/`UserAvatar`/`signOut` imports (checking each file individually), replace `<header>` block with `<AppHeader />`.

- [ ] **Step 4: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit 2>&1 | head -50
```

Fix any errors before committing.

- [ ] **Step 5: Commit**

```bash
cd /home/tobias/trippla
git add src/app/[locale]/trips/page.tsx \
        "src/app/[locale]/trips/[tripId]/page.tsx" \
        src/app/[locale]/settings/page.tsx \
        src/app/[locale]/templates/page.tsx \
        src/app/[locale]/bucketlist/page.tsx
git commit -m "refactor: replace inline headers with AppHeader in top-level pages"
```

---

## Task 5: Replace headers in trip section sub-pages

**Files (back-link mode `AppHeader`, with `backHref`):**
- Modify: `src/app/[locale]/trips/[tripId]/itinerary/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/accommodations/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/expenses/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/transport/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/polls/page.tsx`
- Modify: `src/app/[locale]/trips/[tripId]/stages/page.tsx`

These pages currently show logo + "Back to Trip" link (some also include a `LanguageSwitcher`). Replace with `<AppHeader backHref={...} />`. The `tripId` value is available in each page via `useParams()` or equivalent.

All 7 sub-pages are `"use client"` components. `tripId` is already obtained via `useParams()` in each — it is available as `const params = useParams(); const tripId = params.tripId as string;` which is already present in every sub-page. No new param extraction is needed.

Pattern for each:

```tsx
import { AppHeader } from "@/components/AppHeader";
// tripId is already in scope from existing useParams() call
// Inside JSX, replace <header>...</header> with:
<AppHeader backHref={`/trips/${tripId}`} />
```

After replacement, remove any now-unused imports. Import audit per page:
- `LanguageSwitcher`: only present in `stages/page.tsx` and `transport/page.tsx` — remove from those two only. The other 5 pages do not import it.
- `LocaleLink as Link`: used extensively in page body — keep it.

- [ ] **Step 1: Update all 7 trip section sub-pages**

Apply the pattern above to each of these files:
- `itinerary/page.tsx` — remove nothing extra (no LanguageSwitcher)
- `accommodations/page.tsx` — remove nothing extra
- `expenses/page.tsx` — remove nothing extra
- `packing/page.tsx` — remove nothing extra
- `polls/page.tsx` — remove nothing extra
- `stages/page.tsx` — also remove `import { LanguageSwitcher }` (was only used in header)
- `transport/page.tsx` — also remove `import { LanguageSwitcher }` (was only used in header)

- [ ] **Step 2: Verify TypeScript**

```bash
cd /home/tobias/trippla && npx tsc --noEmit 2>&1 | head -50
```

Fix all errors.

- [ ] **Step 3: Commit**

```bash
cd /home/tobias/trippla
git add "src/app/[locale]/trips/[tripId]/itinerary/page.tsx" \
        "src/app/[locale]/trips/[tripId]/accommodations/page.tsx" \
        "src/app/[locale]/trips/[tripId]/expenses/page.tsx" \
        "src/app/[locale]/trips/[tripId]/transport/page.tsx" \
        "src/app/[locale]/trips/[tripId]/packing/page.tsx" \
        "src/app/[locale]/trips/[tripId]/polls/page.tsx" \
        "src/app/[locale]/trips/[tripId]/stages/page.tsx"
git commit -m "refactor: replace inline headers with AppHeader in trip section pages"
```

---

## Task 6: Final verification

- [ ] **Step 1: Run lint**

```bash
cd /home/tobias/trippla && npm run lint 2>&1 | tail -20
```

Fix any lint errors.

- [ ] **Step 2: Run build**

```bash
cd /home/tobias/trippla && npm run build 2>&1 | tail -30
```

Expected: build completes with no errors. If there are TypeScript or import errors, fix them.

- [ ] **Step 3: Visual check list**

Start the dev server (`npm run dev`) and verify each of these manually:

1. **Trips page** — header shows logo + language switcher + user chip
2. **Click user chip** — dropdown opens with user name/email, Settings link, red Sign Out
3. **Click outside dropdown** — dropdown closes
4. **Press Escape while dropdown open** — dropdown closes
5. **Settings link in dropdown** — navigates to `/settings`
6. **Sign Out in dropdown** — signs out and redirects to `/`
7. **AppNav tabs** — each shows its icon (plane, layout-template, star) to the left of the label
8. **Hover an inactive AppNav tab** — icon color changes to gray-300
9. **Trip detail page** — TripNav inactive tabs are noticeably more readable (gray-400 vs old gray-500)
10. **Trip section pages (e.g. /trips/[id]/expenses)** — header shows logo + "← Back to Trip" link, no user chip

- [ ] **Step 4: Final commit if any fixes were made**

```bash
cd /home/tobias/trippla
git add -A
git commit -m "fix: resolve build and lint issues from nav polish refactor"
```
