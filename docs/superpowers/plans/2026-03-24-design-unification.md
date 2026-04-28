# Design Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify edit/delete actions to ··· dropdowns, add hero sections to top-level pages, move the language switcher to Settings, and enable browser locale auto-detection.

**Architecture:** Four independent change groups applied file-by-file. No new components, no API changes. All changes are pure UI/JSX edits to existing page files plus two config changes (middleware + translations).

**Tech Stack:** Next.js 16, React, Tailwind CSS, next-intl, Lucide icons

**Spec:** `docs/superpowers/specs/2026-03-23-design-unification-design.md`

---

## File Map

**Modified files:**
- `src/middleware.ts` — add `localeDetection: true`
- `src/components/AppHeader.tsx` — remove `LanguageSwitcher`
- `src/app/[locale]/settings/page.tsx` — hero, heading sizes, language section
- `src/app/[locale]/trips/page.tsx` — hero section
- `src/app/[locale]/templates/page.tsx` — hero section
- `src/app/[locale]/bucketlist/page.tsx` — hero section + ··· dropdown
- `src/app/[locale]/trips/[tripId]/itinerary/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/transport/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/accommodations/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/stages/page.tsx` — ··· dropdown
- `src/app/[locale]/trips/[tripId]/polls/page.tsx` — ··· dropdown
- `messages/en.json` — add `settings.language`
- `messages/de.json` — add `settings.language`

---

## ··· Dropdown Pattern Reference

Every ··· dropdown follows this exact structure. Memorise it — it appears 6 times.

```tsx
// 1. Add state at top of component:
const [openMenu{Entity}Id, setOpenMenu{Entity}Id] = useState<string | null>(null);

// 2. Replace the existing inline Edit/Delete buttons with:
{canModify(item.createdBy.id) && (
  <div className="relative">
    <button
      onClick={() => setOpenMenu{Entity}Id(openMenu{Entity}Id === item.id ? null : item.id)}
      className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
    >···</button>
    {openMenu{Entity}Id === item.id && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenu{Entity}Id(null)} />
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
          {/* Edit item (omit for delete-only pages) */}
          <button
            onClick={() => { /* open edit modal */ setOpenMenu{Entity}Id(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
          </button>
          {/* Delete item */}
          <button
            onClick={() => { setShowDeleteConfirm(item.id); setOpenMenu{Entity}Id(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
          </button>
        </div>
      </>
    )}
  </div>
)}
```

For **delete-only** pages (polls, bucket list): omit the Edit button entirely. No border-top separator needed since there's only one item.

---

## Hero Section Pattern Reference

Every hero section follows this structure. The `{WIDTH}` placeholder is `6xl` for all pages except `settings` which uses `2xl`.

```tsx
{/* BEFORE — inside <main className="px-4 md:px-8 py-8 md:py-16"> */}
{/* AFTER — insert ABOVE <main>, change main padding to py-6 md:py-12 */}

<div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
  <div className="max-w-{WIDTH} mx-auto">
    {/* h1 moved here from inside <main> */}
    {/* subtitle moved here */}
    {/* CTA button moved here (trips/bucketlist only) */}
  </div>
</div>
<main className="px-4 md:px-8 py-6 md:py-12">
  {/* remove the wrapper div that held h1+subtitle+button */}
  ...
```

---

## Task 1: Locale auto-detection + translation keys

**Files:**
- Modify: `src/middleware.ts`
- Modify: `messages/en.json`
- Modify: `messages/de.json`

- [ ] **Step 1: Add `localeDetection: true` to middleware**

In `src/middleware.ts`, change:
```ts
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
});
```
to:
```ts
export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});
```

- [ ] **Step 2: Add `settings.language` translation key to en.json**

In `messages/en.json`, find the `"settings"` object and add `"language": "Language"` to it.

- [ ] **Step 3: Add `settings.language` translation key to de.json**

In `messages/de.json`, find the `"settings"` object and add `"language": "Sprache"` to it.

- [ ] **Step 4: Commit**
```bash
git add src/middleware.ts messages/en.json messages/de.json
git commit -m "feat: enable locale auto-detection and add language translation key"
```

---

## Task 2: Remove LanguageSwitcher from AppHeader

**Files:**
- Modify: `src/components/AppHeader.tsx`

- [ ] **Step 1: Remove LanguageSwitcher import and usage**

In `src/components/AppHeader.tsx`:
- Delete the line: `import { LanguageSwitcher } from "@/components/LanguageSwitcher";`
- Delete the line: `<LanguageSwitcher />` (line 63 in the JSX)

- [ ] **Step 2: Verify the app header still renders correctly**

Open `http://localhost:3000` and confirm the header no longer shows the language switcher. The user avatar dropdown and logo should still work.

- [ ] **Step 3: Commit**
```bash
git add src/components/AppHeader.tsx
git commit -m "feat: remove language switcher from app header"
```

---

## Task 3: Settings page — hero, headings, language section

**Files:**
- Modify: `src/app/[locale]/settings/page.tsx`

Current structure (lines 138–278):
```tsx
<div className="min-h-screen bg-[#0a0a0a] text-white">
  <AppHeader />
  <main className="px-4 md:px-8 py-8 md:py-16">
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-black mb-8 md:mb-12 tracking-tighter">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
          {t("settings.title")}
        </span>
      </h1>
      {error && ...}
      {/* Avatar Card */}
      {/* Email Card */}
      {/* Name Card */}
      {/* Password Card */}
    </div>
  </main>
</div>
```

- [ ] **Step 1: Add LanguageSwitcher import**

At the top of `settings/page.tsx`, add:
```tsx
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
```

- [ ] **Step 2: Restructure layout — add hero, update padding**

Replace the outer structure:
```tsx
// BEFORE
<div className="min-h-screen bg-[#0a0a0a] text-white">
  <AppHeader />
  <main className="px-4 md:px-8 py-8 md:py-16">
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-black mb-8 md:mb-12 tracking-tighter">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
          {t("settings.title")}
        </span>
      </h1>
```

```tsx
// AFTER
<div className="min-h-screen bg-[#0a0a0a] text-white">
  <AppHeader />
  <div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter">
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
          {t("settings.title")}
        </span>
      </h1>
    </div>
  </div>
  <main className="px-4 md:px-8 py-6 md:py-12">
    <div className="max-w-2xl mx-auto">
```

- [ ] **Step 3: Update all four h2 section headings**

Search for `className="text-xl font-bold mb-4"` (there are exactly 4 occurrences) and change each to `className="text-2xl font-black tracking-tight mb-4"`. Do not change translation keys — only the className attribute:
- `{t("settings.profilePicture")}` — className only
- `{t("auth.email")}` — className only (different translation namespace, leave the key as-is)
- `{t("settings.displayName")}` — className only
- `{t("settings.changePassword")}` — className only

Note: these h2s will be at slightly different line numbers after Step 2 inserts the hero section above them. Always search by the class string, not by line number.

- [ ] **Step 4: Add Language section after Password card**

After the closing `</Card>` of the Change Password section, before the closing `</div></main>`, add:

```tsx
          {/* Language */}
          <Card className="p-6 mt-6">
            <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.language")}</h2>
            <LanguageSwitcher />
          </Card>
```

Using `<Card>` (same as all other sections on this page) rather than a plain `<div>` keeps the layout consistent. The `mt-6` matches the existing `mb-6` spacing between other cards.

- [ ] **Step 5: Verify settings page visually**

Navigate to `/settings`. Confirm:
- Hero section with gradient background appears above the cards
- Section headings are larger and bolder
- Language card appears at the bottom with the switcher
- No language switcher in the header

- [ ] **Step 6: Commit**
```bash
git add src/app/\[locale\]/settings/page.tsx
git commit -m "feat: add hero section, update headings, and move language switcher to settings page"
```

---

## Task 4: Hero section — Trips page

**Files:**
- Modify: `src/app/[locale]/trips/page.tsx`

Current structure (lines 206–228):
```tsx
<main className="px-4 md:px-8 py-8 md:py-16">
  <div className="max-w-6xl mx-auto">
    <div className="mb-8 md:mb-12 flex justify-between items-end gap-4 flex-wrap">
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter">
          {t("trips.yourTrips").split(" ")[0]}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("trips.yourTrips").split(" ")[1]}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400">
          {trips.length} {trips.length === 1 ? t("trips.trip") : t("trips.trips")}
        </p>
      </div>
      <Button onClick={() => setShowCreateModal(true)} variant="gradient" size="lg">
        {t("trips.createTrip")}
      </Button>
    </div>
    {/* grid of trip cards */}
```

- [ ] **Step 1: Restructure to hero + main**

Replace the structure above with:
```tsx
<div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
  <div className="max-w-6xl mx-auto">
    <div className="flex justify-between items-end gap-4 flex-wrap">
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter">
          {t("trips.yourTrips").split(" ")[0]}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("trips.yourTrips").split(" ")[1]}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400">
          {trips.length} {trips.length === 1 ? t("trips.trip") : t("trips.trips")}
        </p>
      </div>
      <Button onClick={() => setShowCreateModal(true)} variant="gradient" size="lg">
        {t("trips.createTrip")}
      </Button>
    </div>
  </div>
</div>
<main className="px-4 md:px-8 py-6 md:py-12">
  <div className="max-w-6xl mx-auto">
    {/* grid of trip cards — unchanged */}
```

The closing `</div></main>` at the end of the JSX must be preserved.

- [ ] **Step 2: Verify trips page visually**

Navigate to `/trips`. Confirm the gradient hero separator appears between the header and the trip grid.

- [ ] **Step 3: Commit**
```bash
git add src/app/\[locale\]/trips/page.tsx
git commit -m "feat: add hero section to trips page"
```

---

## Task 5: Hero section — Templates page

**Files:**
- Modify: `src/app/[locale]/templates/page.tsx`

Current structure (lines 386–426):
```tsx
<main className="px-4 md:px-8 py-8 md:py-16">
  <div className="max-w-6xl mx-auto">
    <div className="mb-8">
      <h1 className="flex items-center gap-3 text-4xl md:text-6xl font-black mb-2 tracking-tighter">
        <ClipboardList className="w-8 h-8 shrink-0" />
        {t("templates.title").split(" ")[0]}{" "}
        <span className="...gradient...">{t("templates.title").split(" ").slice(1).join(" ")}</span>
      </h1>
      <p className="text-gray-400 text-lg">{t("templates.subtitle")}</p>
    </div>
    {/* Main Tab Switcher */}
    <div className="flex gap-1 mb-8 border-b border-white/10">
      ...tabs...
    </div>
```

- [ ] **Step 1: Move h1 and tab bar into hero**

```tsx
// BEFORE: <main className="px-4 md:px-8 py-8 md:py-16">
// AFTER:

<div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
  <div className="max-w-6xl mx-auto">
    <h1 className="flex items-center gap-3 text-4xl md:text-6xl font-black mb-2 tracking-tighter">
      <ClipboardList className="w-8 h-8 shrink-0" />
      {t("templates.title").split(" ")[0]}{" "}
      <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
        {t("templates.title").split(" ").slice(1).join(" ")}
      </span>
    </h1>
    <p className="text-gray-400 text-lg">{t("templates.subtitle")}</p>
    {/* Main Tab Switcher — moved here from main */}
    <div className="flex gap-1 mt-6 border-b border-white/10">
      <button
        onClick={() => setActiveMainTab("trips")}
        className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px ${
          activeMainTab === "trips"
            ? "border-teal-400 text-teal-400"
            : "border-transparent text-gray-400 hover:text-gray-200"
        }`}
      >
        {t("templates.tripsTab")}
      </button>
      <button
        onClick={() => { setActiveMainTab("packing"); fetchPackingTemplates(); }}
        className={`px-6 py-3 text-sm font-semibold uppercase tracking-wider transition-colors border-b-2 -mb-px flex items-center gap-2 ${
          activeMainTab === "packing"
            ? "border-teal-400 text-teal-400"
            : "border-transparent text-gray-400 hover:text-gray-200"
        }`}
      >
        <Backpack className="w-4 h-4" />
        {t("templates.packingListsTab")}
      </button>
    </div>
  </div>
</div>
<main className="px-4 md:px-8 py-6 md:py-12">
  <div className="max-w-6xl mx-auto">
    {/* Remove the old <div className="mb-8">...</div> h1 block */}
    {/* Remove the old tab switcher <div className="flex gap-1 mb-8 border-b..."> */}
    {/* Trip and packing tab content starts here unchanged */}
```

Note: the tab switcher's `border-b border-white/10` now acts as the bottom of the hero, so the `-mb-px` trick visually merges the tab underline with the hero border. The tab's `mb-8` margin is removed since it's now in the hero.

- [ ] **Step 2: Verify templates page visually**

Navigate to `/templates`. Confirm hero gradient appears and tabs sit at the bottom of the hero section aligned with the hero border.

- [ ] **Step 3: Commit**
```bash
git add src/app/\[locale\]/templates/page.tsx
git commit -m "feat: add hero section to templates page"
```

---

## Task 6: Hero section + ··· dropdown — Bucket List page

**Files:**
- Modify: `src/app/[locale]/bucketlist/page.tsx`

- [ ] **Step 1: Add state for ··· menu**

Add near the top of the component with other state vars:
```tsx
const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Trash2 import**

In the lucide-react import line, add `Trash2` (check if already imported).

- [ ] **Step 3: Add hero section**

Current structure (lines 171–188):
```tsx
<main className="px-4 md:px-8 py-8 md:py-16">
  <div className="max-w-6xl mx-auto">
    <div className="mb-8 md:mb-12">
      <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter flex items-center gap-3">
        <Sparkles className="w-8 h-8 shrink-0" />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
          {t("bucketList.title")}
        </span>
      </h1>
      <p className="text-lg md:text-xl text-gray-400">
        {items.length} {items.length === 1 ? t("trips.trip") : t("trips.trips")}
      </p>
    </div>
```

Replace with:
```tsx
<div className="border-b border-white/10 px-4 md:px-8 py-6 md:py-12 bg-gradient-to-b from-white/5 to-transparent">
  <div className="max-w-6xl mx-auto">
    <div className="flex justify-between items-end gap-4 flex-wrap">
      <div>
        <h1 className="text-4xl md:text-6xl font-black mb-2 tracking-tighter flex items-center gap-3">
          <Sparkles className="w-8 h-8 shrink-0" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("bucketList.title")}
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400">
          {items.length} {items.length === 1 ? t("trips.trip") : t("trips.trips")}
        </p>
      </div>
      <Button onClick={() => { setShowAddModal(true); setError(""); setDestination(""); setTripType(""); }} variant="gradient" size="lg">
        {t("bucketList.addItem")}
      </Button>
    </div>
  </div>
</div>
<main className="px-4 md:px-8 py-6 md:py-12">
  <div className="max-w-6xl mx-auto">
```

The old structure inside `<main>` had two parts to delete:
1. The `<div className="mb-8 md:mb-12">` block (h1 + subtitle) — deleted because it moves into the hero above.
2. The standalone `<Button onClick={() => { setShowAddModal(true); ... }}>` near the bottom of the grid section (after the card grid) — deleted because the Add button now lives in the hero.

The new `<main>` content starts directly with the empty-state check and the card grid.

- [ ] **Step 4: Replace Delete Button with ··· dropdown**

Current (lines 226–248):
```tsx
<div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
  <Button variant="gradient" size="sm" className="flex-1" onClick={() => { setPlanItem(item); ... }}>
    {t("bucketList.planThisTrip")}
  </Button>
  <Button variant="outline" size="sm" className="border-red-500/50 text-red-400 hover:bg-red-500/10" onClick={() => setDeleteItem(item)}>
    {t("common.delete")}
  </Button>
</div>
```

Replace with:
```tsx
<div className="mt-4 pt-4 border-t border-white/10 flex gap-2 items-center">
  <Button variant="gradient" size="sm" className="flex-1" onClick={() => { setPlanItem(item); setPlanStartDate(""); setPlanEndDate(""); setPlanError(""); }}>
    {t("bucketList.planThisTrip")}
  </Button>
  <div className="relative">
    <button
      onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
      className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
    >···</button>
    {openMenuItemId === item.id && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
          <button
            onClick={() => { setDeleteItem(item); setOpenMenuItemId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
          </button>
        </div>
      </>
    )}
  </div>
</div>
```

- [ ] **Step 5: Verify bucket list page visually**

Navigate to `/bucketlist`. Confirm hero, add button in hero, and ··· dropdown on cards.

- [ ] **Step 6: Commit**
```bash
git add src/app/\[locale\]/bucketlist/page.tsx
git commit -m "feat: add hero section and standardise delete dropdown on bucket list page"
```

---

## Task 7: ··· dropdown — Itinerary page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/itinerary/page.tsx`

- [ ] **Step 1: Add state**

```tsx
const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Pencil and Trash2 imports**

Check the existing `lucide-react` import line and add `Pencil, Trash2` if not already present.

- [ ] **Step 3: Replace inline Edit/Delete buttons on card row**

Current (lines 430–450):
```tsx
{canModify(item.createdBy.id) && (
<div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
  <button onClick={() => { setEditingItem(item); setEditLocation(item.location || ""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); }}
    className="px-2 md:px-3 py-1 text-xs md:text-sm border border-white/20 hover:bg-white/5 transition-colors">
    {t("common.edit")}
  </button>
  <button onClick={() => setShowDeleteConfirm(item.id)}
    className="px-2 md:px-3 py-1 text-xs md:text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors">
    {t("common.delete")}
  </button>
</div>
)}
```

Replace with (keep `onClick={(e) => e.stopPropagation()}` on the wrapper to avoid triggering item selection):
```tsx
{canModify(item.createdBy.id) && (
<div className="relative" onClick={(e) => e.stopPropagation()}>
  <button
    onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
    className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
  >···</button>
  {openMenuItemId === item.id && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
      <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
        <button
          onClick={() => { setEditingItem(item); setEditLocation(item.location || ""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); setOpenMenuItemId(null); }}
          className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
        >
          <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
        </button>
        <button
          onClick={() => { setShowDeleteConfirm(item.id); setOpenMenuItemId(null); }}
          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
        </button>
      </div>
    </>
  )}
</div>
)}
```

Note: The Edit button in the slide-out detail panel (around line 901) is **left in place**.

- [ ] **Step 4: Verify itinerary page**

Open a trip's itinerary. Confirm the ··· button appears on each item and both Edit and Delete work.

- [ ] **Step 5: Commit**
```bash
git add src/app/\[locale\]/trips/\[tripId\]/itinerary/page.tsx
git commit -m "feat: standardise edit/delete to dots dropdown on itinerary page"
```

---

## Task 8: ··· dropdown — Transport page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/transport/page.tsx`

- [ ] **Step 1: Add state**

```tsx
const [openMenuTransportId, setOpenMenuTransportId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Pencil and Trash2 imports**

- [ ] **Step 3: Replace inline Edit/Delete buttons**

Current (lines 641–661) — the buttons are inside a `div.flex.gap-2.mt-4.pt-3.border-t` at the bottom of each transport card:
```tsx
{canModify(transport.createdBy.id) && (
<div className="flex gap-2 mt-4 pt-3 border-t border-white/10">
  <button onClick={() => { setEditingTransport(transport); setError(""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); }}
    className="text-xs text-gray-500 hover:text-teal-400 transition-colors uppercase tracking-wider font-bold">
    {t("common.edit")}
  </button>
  <button onClick={() => setShowDeleteConfirm(transport.id)}
    className="text-xs text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider font-bold">
    {t("common.delete")}
  </button>
</div>
)}
```

Replace with:
```tsx
{canModify(transport.createdBy.id) && (
<div className="mt-4 pt-3 border-t border-white/10 flex justify-end">
  <div className="relative">
    <button
      onClick={() => setOpenMenuTransportId(openMenuTransportId === transport.id ? null : transport.id)}
      className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
    >···</button>
    {openMenuTransportId === transport.id && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuTransportId(null)} />
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
          <button
            onClick={() => { setEditingTransport(transport); setError(""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); setOpenMenuTransportId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(transport.id); setOpenMenuTransportId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
          </button>
        </div>
      </>
    )}
  </div>
</div>
)}
```

- [ ] **Step 4: Verify transport page**

- [ ] **Step 5: Commit**
```bash
git add src/app/\[locale\]/trips/\[tripId\]/transport/page.tsx
git commit -m "feat: standardise edit/delete to dots dropdown on transport page"
```

---

## Task 9: ··· dropdown — Accommodations page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/accommodations/page.tsx`

- [ ] **Step 1: Add state**

```tsx
const [openMenuItemId, setOpenMenuItemId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Pencil and Trash2 imports**

- [ ] **Step 3: Replace inline Edit/Delete buttons**

Current (lines 369–390):
```tsx
{canModify(item.createdBy.id) && (
  <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
    <button onClick={() => { setEditingItem(item); setEditLocation(item.location || ""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); }}
      className="px-2 md:px-3 py-1 text-xs md:text-sm border border-white/20 hover:bg-white/5 transition-colors">
      {t("common.edit")}
    </button>
    <button onClick={() => setShowDeleteConfirm(item.id)}
      className="px-2 md:px-3 py-1 text-xs md:text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors">
      {t("common.delete")}
    </button>
  </div>
)}
```

Replace with:
```tsx
{canModify(item.createdBy.id) && (
  <div className="relative" onClick={(e) => e.stopPropagation()}>
    <button
      onClick={() => setOpenMenuItemId(openMenuItemId === item.id ? null : item.id)}
      className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
    >···</button>
    {openMenuItemId === item.id && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuItemId(null)} />
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
          <button
            onClick={() => { setEditingItem(item); setEditLocation(item.location || ""); setEditSplitMemberIds(members.map((m) => m.userId)); setShowEditModal(true); setOpenMenuItemId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(item.id); setOpenMenuItemId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
          </button>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify accommodations page**

- [ ] **Step 5: Commit**
```bash
git add src/app/\[locale\]/trips/\[tripId\]/accommodations/page.tsx
git commit -m "feat: standardise edit/delete to dots dropdown on accommodations page"
```

---

## Task 10: ··· dropdown — Stages page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/stages/page.tsx`

- [ ] **Step 1: Add state**

```tsx
const [openMenuStageId, setOpenMenuStageId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Pencil and Trash2 imports**

- [ ] **Step 3: Replace inline Edit/Delete buttons**

Current (lines 456–477) — buttons inside `<>` fragment within `canModify` block, inside a `div.flex.gap-2.mt-4.pt-3.border-t.flex-wrap.items-center`:
```tsx
{canModify(stage.createdBy.id) && (
  <>
    <button onClick={() => { setEditingStage(stage); setEditGpxFile(null); setEditGpxName(""); setError(""); setShowEditModal(true); }}
      className="text-xs text-gray-500 hover:text-teal-400 transition-colors uppercase tracking-wider font-bold">
      {t("common.edit")}
    </button>
    <button onClick={() => setShowDeleteConfirm(stage.id)}
      className="text-xs text-gray-500 hover:text-red-400 transition-colors uppercase tracking-wider font-bold">
      {t("common.delete")}
    </button>
  </>
)}
```

Replace the `<>...</>` fragment with:
```tsx
{canModify(stage.createdBy.id) && (
  <div className="relative">
    <button
      onClick={() => setOpenMenuStageId(openMenuStageId === stage.id ? null : stage.id)}
      className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
    >···</button>
    {openMenuStageId === stage.id && (
      <>
        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuStageId(null)} />
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
          <button
            onClick={() => { setEditingStage(stage); setEditGpxFile(null); setEditGpxName(""); setError(""); setShowEditModal(true); setOpenMenuStageId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-2"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />{t("common.edit")}
          </button>
          <button
            onClick={() => { setShowDeleteConfirm(stage.id); setOpenMenuStageId(null); }}
            className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
          </button>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 4: Verify stages page**

- [ ] **Step 5: Commit**
```bash
git add src/app/\[locale\]/trips/\[tripId\]/stages/page.tsx
git commit -m "feat: standardise edit/delete to dots dropdown on stages page"
```

---

## Task 11: ··· dropdown — Polls page (delete only)

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/polls/page.tsx`

- [ ] **Step 1: Add state**

```tsx
const [openMenuPollId, setOpenMenuPollId] = useState<string | null>(null);
```

- [ ] **Step 2: Add Trash2 import**

- [ ] **Step 3: Replace inline Delete button**

Current (lines 319–326):
```tsx
{canModify(poll.createdBy.id) && (
<button
  onClick={() => setShowDeleteConfirm(poll.id)}
  className="px-3 py-1 text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors"
>
  {t("common.delete")}
</button>
)}
```

Replace with (delete-only ··· dropdown — no Edit item, no border-top separator):
```tsx
{canModify(poll.createdBy.id) && (
<div className="relative">
  <button
    onClick={() => setOpenMenuPollId(openMenuPollId === poll.id ? null : poll.id)}
    className="w-8 h-8 flex items-center justify-center border border-white/20 hover:bg-white/5 transition-colors text-gray-400 hover:text-white tracking-widest"
  >···</button>
  {openMenuPollId === poll.id && (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuPollId(null)} />
      <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/20 z-20 min-w-[130px]">
        <button
          onClick={() => { setShowDeleteConfirm(poll.id); setOpenMenuPollId(null); }}
          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />{t("common.delete")}
        </button>
      </div>
    </>
  )}
</div>
)}
```

- [ ] **Step 4: Verify polls page**

- [ ] **Step 5: Commit**
```bash
git add src/app/\[locale\]/trips/\[tripId\]/polls/page.tsx
git commit -m "feat: standardise delete to dots dropdown on polls page"
```

---

## Task 12: Final verification

- [ ] **Step 1: Smoke test all changed pages**

Visit each page and confirm:
- `/trips` — hero gradient visible
- `/templates` — hero gradient visible, tabs inside hero
- `/bucketlist` — hero gradient, Add button in hero, ··· dropdown on cards
- `/settings` — hero gradient, larger h2s, Language card at bottom with switcher
- Any trip → Itinerary — ··· dropdown (Edit + Delete)
- Any trip → Transport — ··· dropdown (Edit + Delete)
- Any trip → Accommodations — ··· dropdown (Edit + Delete)
- Any trip → Stages — ··· dropdown (Edit + Delete)
- Any trip → Polls — ··· dropdown (Delete only)
- Language switcher **not** in app header

- [ ] **Step 2: Test locale auto-detection**

Open a private browser window and navigate to `http://localhost:3000/`. Confirm it redirects to `/en/` or `/de/` based on browser language.

- [ ] **Step 3: Deploy**

Run the deploy skill to push to production.
