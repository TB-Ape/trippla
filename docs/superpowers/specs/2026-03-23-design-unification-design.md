# Design Unification — Spec

**Date:** 2026-03-23

---

## Overview

Unify the visual design across all app pages. Three targeted changes: standardise the ··· dropdown for all edit/delete actions, add gradient hero sections to top-level pages, and move the language switcher into Settings with browser-based auto-detection for non-logged-in users.

---

## Goals

- One consistent edit/delete pattern across every page
- Top-level pages visually consistent with trip sub-pages (hero section)
- Settings section headings match the weight/scale of the rest of the app
- Language preference accessible from Settings; non-logged-in users get auto-detected language

## Out of Scope

- Spacing/typography audit beyond Settings headings
- Landing page, auth pages, legal pages
- Adding edit functionality to Polls or Bucket List (they stay delete-only)
- Locale persistence for logged-in users in the database (language selection only changes the URL prefix)

---

## Change 1: Standardise ··· Dropdown for Edit/Delete

### Pattern (matches existing Expenses/Packing implementation)

**Trigger button:**
```
className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
```
Content: `···` (three dots, `tracking-widest`)

**Dropdown container:**
```
className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]"
```

**Edit item:**
```
className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
```
Icon: `<Pencil className="w-3.5 h-3.5 shrink-0" />`

**Delete item:**
```
className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
```
Icon: `<Trash2 className="w-3.5 h-3.5 shrink-0" />`

**Click-outside close:** wrap trigger + dropdown in `<div className="relative">`. Add a `<div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />` overlay when open (same pattern as packing page).

### Pages to update

| Page | State var to add | Actions |
|------|-----------------|---------|
| `itinerary/page.tsx` | `openMenuItemId: string \| null` | Edit + Delete |
| `transport/page.tsx` | `openMenuTransportId: string \| null` | Edit + Delete |
| `accommodations/page.tsx` | `openMenuItemId: string \| null` | Edit + Delete |
| `stages/page.tsx` | `openMenuStageId: string \| null` | Edit + Delete |
| `polls/page.tsx` | `openMenuPollId: string \| null` | Delete only |
| `bucketlist/page.tsx` | `openMenuItemId: string \| null` | Delete only |

For pages with **delete only**, the dropdown has a single item (Delete) with no border-top separator.

**Remove from each page:** the existing inline Edit/Delete buttons or `Button` component that currently render directly in the card/row. Specifically:
- `itinerary/page.tsx`: The inline Delete button on the card row is replaced by the ··· dropdown. The Edit button inside the slide-out item detail panel is **left in place** — the ··· dropdown on the card row adds a second entry point for Edit, it does not remove the one in the detail panel.
- `bucketlist/page.tsx`: Only the inline Delete `Button` component is replaced. The "Plan This Trip" button in the same card footer row stays in place untouched.
- All other pages: remove the existing inline Edit/Delete buttons directly from the card/row.

**Imports to add per page:** `Pencil`, `Trash2` from `lucide-react` (only where not already imported).

---

## Change 2: Hero Sections on Top-Level Pages

### Hero HTML pattern (matches trip sub-pages exactly)

```tsx
<div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
  <div className="max-w-{WIDTH} mx-auto">
    {/* TripNav or AppNav goes here if applicable */}
    <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter">
      {pageTitle}
    </h1>
    <p className="text-gray-500 text-sm md:text-base">{subtitle}</p>
    {/* CTA button if applicable */}
  </div>
</div>
```

Main content area padding changes from `py-8 md:py-16` → `py-6 md:py-12` to match sub-pages.

### Pages to update

| Page | max-width | Notes |
|------|-----------|-------|
| `trips/page.tsx` | `max-w-6xl` | Move h1 + subtitle + "+ New Trip" button into hero |
| `templates/page.tsx` | `max-w-6xl` | Move h1 + tab bar into hero |
| `bucketlist/page.tsx` | `max-w-6xl` | Move h1 + subtitle + "+ Add" button into hero |
| `settings/page.tsx` | `max-w-2xl` | Move h1 into hero; keep content at `max-w-2xl`. The existing h1 wraps its text in a gradient span (`text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500`) — preserve this span inside the hero h1 as-is. |

---

## Change 3: Settings Page Headings

Section `<h2>` headings in `settings/page.tsx`:

- **Before:** `className="text-xl font-bold mb-4"`
- **After:** `className="text-2xl font-black tracking-tight mb-4"`

Applies to all four section titles: Profile Picture, Email, Display Name, Change Password. Note: the Email heading uses `t("auth.email")` (a different translation namespace) — it is still updated to the new className, just the translation key differs from the others.

---

## Change 4: Language Switcher → Settings + Auto-Detection

### Remove from AppHeader

Delete the `<LanguageSwitcher />` import and usage from `src/components/AppHeader.tsx`.

### Add to Settings page

Add a new **Language** section at the bottom of `settings/page.tsx`, after the Change Password section:

```tsx
<div className="mt-8">
  <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.language")}</h2>
  <LanguageSwitcher />
</div>
```

Add translation keys:
- `en.json`: `"settings": { ..., "language": "Language" }`
- `de.json`: `"settings": { ..., "language": "Sprache" }`

### Auto-detection for non-logged-in users

In `src/middleware.ts`, add `localeDetection: true` to the `createMiddleware` config:

```ts
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
```

This makes next-intl read the `Accept-Language` request header and redirect to the matching locale when a URL without a locale prefix is requested (e.g. `/` → `/de/` for a German browser). Detection runs on all requests matching the middleware pattern, regardless of auth state — but in practice the app always generates locale-prefixed links, so logged-in users are unaffected. No cookie or database storage required.

---

## Affected Files

- `src/components/AppHeader.tsx` — remove LanguageSwitcher
- `src/middleware.ts` — add localeDetection
- `src/app/[locale]/trips/page.tsx` — hero section
- `src/app/[locale]/templates/page.tsx` — hero section
- `src/app/[locale]/bucketlist/page.tsx` — hero section + ··· dropdown
- `src/app/[locale]/settings/page.tsx` — hero section, heading sizes, language section
- `src/app/[locale]/trips/[tripId]/itinerary/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/transport/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/accommodations/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/stages/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/polls/page.tsx` — ··· dropdown
- `messages/en.json` — add `settings.language`
- `messages/de.json` — add `settings.language`

---

## Success Criteria

- Every page with editable items uses the `···` dropdown — no inline Edit/Delete buttons or `Button` components for these actions
- Trips, Templates, Bucket List, and Settings all have the gradient hero section with `border-b` separator
- Settings section h2s are visually consistent with the rest of the app
- Language switcher is no longer in the app header
- Visiting the app without a locale in the URL auto-redirects to the user's browser language (en or de)
