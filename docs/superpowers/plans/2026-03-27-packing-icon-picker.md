# Packing Icon Picker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the emoji text input for custom packing categories with a curated Lucide icon picker matching the visual style of built-in categories, and let users change a custom category's icon after creation.

**Architecture:** A new `packingIcons.ts` utility exports the icon map and `getPackingIcon()` helper. A new `PackingIconPicker` component renders the grid. A new `PATCH /api/trips/[tripId]/packing/category` route bulk-updates the icon across all items in a category. The packing page is updated to use these instead of the emoji text input, and every render site that displayed `item.categoryEmoji` as raw text is updated to render the Lucide icon.

**Tech Stack:** Next.js 14+ App Router, TypeScript, Prisma, Lucide React, Zod, NextAuth v4

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/lib/packingIcons.ts` | `PACKING_ICON_MAP` and `getPackingIcon()` — single source of truth for the curated icon set |
| Create | `src/components/PackingIconPicker.tsx` | Icon grid picker component used in the add-item form and category header |
| Create | `src/app/api/trips/[tripId]/packing/category/route.ts` | `PATCH` endpoint to update icon on all items in a category |
| Modify | `src/app/[locale]/trips/[tripId]/packing/page.tsx` | Replace emoji input, fix all render sites, add header edit state |

---

## Task 1: `src/lib/packingIcons.ts` — icon utility

**Files:**
- Create: `src/lib/packingIcons.ts`

- [ ] **Step 1: Create the file**

```ts
import {
  Camera, Utensils, Music, Pill, Dumbbell, Bike, Glasses, Coffee,
  Globe, Book, PawPrint, Gamepad2, Sun, Baby, Heart, Star,
  Shirt, Backpack, Scissors, Phone, Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const PACKING_ICON_MAP: Record<string, LucideIcon> = {
  Camera, Utensils, Music, Pill, Dumbbell, Bike, Glasses, Coffee,
  Globe, Book, PawPrint, Gamepad2, Sun, Baby, Heart, Star,
  Shirt, Backpack, Scissors, Phone,
};

export function getPackingIcon(name: string | null | undefined): LucideIcon {
  if (name && name in PACKING_ICON_MAP) return PACKING_ICON_MAP[name];
  return Package;
}
```

- [ ] **Step 2: Verify TypeScript is happy**

Run: `npx tsc --noEmit`
Expected: no errors relating to this file

- [ ] **Step 3: Commit**

```bash
git add src/lib/packingIcons.ts
git commit -m "feat: add packing icon map and getPackingIcon utility"
```

---

## Task 2: `src/components/PackingIconPicker.tsx` — picker component

**Files:**
- Create: `src/components/PackingIconPicker.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { PACKING_ICON_MAP } from "@/lib/packingIcons";

interface PackingIconPickerProps {
  selected: string;
  onChange: (iconName: string) => void;
}

export function PackingIconPicker({ selected, onChange }: PackingIconPickerProps) {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
      {Object.entries(PACKING_ICON_MAP).map(([name, Icon]) => (
        <button
          key={name}
          type="button"
          title={name}
          onClick={() => onChange(name)}
          className={`w-9 h-9 flex items-center justify-center rounded border-2 transition-colors ${
            selected === name
              ? "border-indigo-500/70 bg-indigo-500/25"
              : "border-transparent bg-white/5 hover:bg-white/10"
          }`}
        >
          <Icon
            className={`w-[18px] h-[18px] ${
              selected === name ? "text-indigo-300" : "text-slate-400"
            }`}
          />
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PackingIconPicker.tsx
git commit -m "feat: add PackingIconPicker component"
```

---

## Task 3: `PATCH /api/trips/[tripId]/packing/category` — bulk icon update endpoint

**Files:**
- Create: `src/app/api/trips/[tripId]/packing/category/route.ts`

Study the pattern in `src/app/api/trips/[tripId]/packing/route.ts` — note how it uses `await params`, `getServerSession`, `getTripById` for membership check, and structured error handling.

- [ ] **Step 1: Create the route**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTripById } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { PACKING_ICON_MAP } from "@/lib/packingIcons";

const updateCategoryIconSchema = z.object({
  category: z.string().min(1).max(50),
  iconName: z.enum(Object.keys(PACKING_ICON_MAP) as [string, ...string[]]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const trip = await getTripById(tripId, session.user.id);
    if (!trip) {
      return NextResponse.json({ error: "Trip not found" }, { status: 404 });
    }

    const body = await req.json();
    const { category, iconName } = updateCategoryIconSchema.parse(body);

    const { count } = await prisma.packingItem.updateMany({
      where: { list: { tripId }, category },
      data: { categoryEmoji: iconName },
    });

    return NextResponse.json({ updated: count }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Update category icon error:", error);
    return NextResponse.json({ error: "Failed to update category icon" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Manual test**

Start the dev server (`npm run dev`) and run in a terminal:

```bash
# Replace with real tripId and a custom category name you have in the dev DB
curl -X PATCH http://localhost:3000/api/trips/TRIP_ID/packing/category \
  -H "Content-Type: application/json" \
  -d '{"category":"test","iconName":"Camera"}'
# Expected: {"updated":0} (or a number if items exist)

# Verify bad icon name is rejected:
curl -X PATCH http://localhost:3000/api/trips/TRIP_ID/packing/category \
  -H "Content-Type: application/json" \
  -d '{"category":"test","iconName":"NotAnIcon"}'
# Expected: 400 with error message
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trips/\[tripId\]/packing/category/route.ts
git commit -m "feat: add PATCH packing/category endpoint for bulk icon update"
```

---

## Task 4: Packing page — replace emoji input with `PackingIconPicker`

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx`

This task covers:
1. Adding the new imports
2. Replacing the `customEmoji` state with `customIconName`
3. Replacing the `w-14` emoji `<Input>` with `<PackingIconPicker>`
4. Updating all three raw-emoji render sites to use `getPackingIcon`

Open the file and make the following changes in order:

- [ ] **Step 1: Update the import line (line 20)**

Current:
```ts
import { Shirt, Droplets, Plug, FileText, Tent, CookingPot, Wrench, Flashlight, Footprints, Compass, ShieldCheck, Waves, Anchor, Car, Cookie, Mountain, Briefcase, Package, Lock, Pencil, Backpack, Share2, Copy, Check, ExternalLink, MoreVertical } from "lucide-react";
```

Add two new imports above it:
```ts
import { getPackingIcon } from "@/lib/packingIcons";
import { PackingIconPicker } from "@/components/PackingIconPicker";
```

- [ ] **Step 2: Replace `customEmoji` state with `customIconName` (around line 109)**

Remove:
```ts
const [customEmoji, setCustomEmoji] = useState("");
```

Add:
```ts
const [customIconName, setCustomIconName] = useState("");
```

- [ ] **Step 3: Update `handleAddItem` — `categoryEmoji` field (around line 259)**

Change:
```ts
categoryEmoji: useCustomCategory && customEmoji ? customEmoji : undefined,
```
To:
```ts
categoryEmoji: useCustomCategory && customIconName ? customIconName : undefined,
```

- [ ] **Step 4: Update `handleAddItem` — reset on success (around line 271)**

Change:
```ts
setCustomEmoji("");
```
To:
```ts
setCustomIconName("");
```

- [ ] **Step 5: Fix render site 1 — "My items" section (around line 641)**

Current (lines 641, 654–658):
```tsx
const CategoryIcon = getCategoryIcon(item.category);
// ...
{item.categoryEmoji ? (
  <span className="text-xl md:text-2xl">{item.categoryEmoji}</span>
) : (
  <CategoryIcon className="w-6 h-6 shrink-0" />
)}
```

Replace those lines with:
```tsx
const CategoryIcon = item.categoryEmoji
  ? getPackingIcon(item.categoryEmoji)
  : getCategoryIcon(item.category);
// ...
<CategoryIcon className="w-6 h-6 shrink-0" />
```

(Remove the `item.categoryEmoji ?` ternary entirely — `CategoryIcon` now handles both cases.)

- [ ] **Step 6: Fix render site 2 — shared list items section (around line 885)**

Current (lines 885, 902–906):
```tsx
const ItemIcon = getCategoryIcon(item.category);
// ...
{item.categoryEmoji ? (
  <span className="text-xl md:text-2xl">{item.categoryEmoji}</span>
) : (
  <ItemIcon className="w-6 h-6 shrink-0" />
)}
```

Replace with:
```tsx
const ItemIcon = item.categoryEmoji
  ? getPackingIcon(item.categoryEmoji)
  : getCategoryIcon(item.category);
// ...
<ItemIcon className="w-6 h-6 shrink-0" />
```

- [ ] **Step 7: Fix render site 3 — import template preview (around line 1162)**

`item` here is `PackingPreviewItem` (interface at line 49). It already has `categoryEmoji: string | null`, so no interface change is needed.

Current:
```tsx
{item.categoryEmoji ? (
  <span>{item.categoryEmoji}</span>
) : (
  <span className="w-2.5 h-2.5 border border-white/20 flex-shrink-0" />
)}
```

Replace with:
```tsx
{(() => {
  const PreviewIcon = getPackingIcon(item.categoryEmoji);
  return <PreviewIcon className="w-3 h-3 shrink-0 text-gray-500" />;
})()}
```

- [ ] **Step 8: Replace the emoji text input in the add-item form (around line 1304)**

Remove:
```tsx
<div className="flex gap-2">
  <Input
    value={customEmoji}
    onChange={(e) => setCustomEmoji(e.target.value)}
    placeholder="📦"
    className="w-14 text-center text-lg px-1"
    maxLength={2}
  />
  <Input
    id="custom-category"
    value={customCategory}
    onChange={(e) => setCustomCategory(e.target.value)}
    placeholder={t("packing.customCategory")}
    className="flex-1"
  />
  <button
    type="button"
    onClick={() => { setUseCustomCategory(false); setCustomCategory(""); setCustomEmoji(""); }}
    className="px-3 py-2 text-sm border border-white/20 hover:bg-white/5 transition-colors"
    title={t("common.cancel")}
  >
    ✕
  </button>
</div>
```

Replace with:
```tsx
<div className="space-y-2">
  <PackingIconPicker selected={customIconName} onChange={setCustomIconName} />
  <div className="flex gap-2">
    <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-indigo-500/20 border border-indigo-500/50 rounded">
      {(() => {
        const PreviewIcon = getPackingIcon(customIconName);
        return <PreviewIcon className="w-[18px] h-[18px] text-indigo-300" />;
      })()}
    </div>
    <Input
      id="custom-category"
      value={customCategory}
      onChange={(e) => setCustomCategory(e.target.value)}
      placeholder={t("packing.customCategory")}
      className="flex-1"
    />
    <button
      type="button"
      onClick={() => { setUseCustomCategory(false); setCustomCategory(""); setCustomIconName(""); }}
      className="px-3 py-2 text-sm border border-white/20 hover:bg-white/5 transition-colors"
      title={t("common.cancel")}
    >
      ✕
    </button>
  </div>
</div>
```

- [ ] **Step 9: Update cancel button in Modal.Footer (around line 1359)**

After Step 8 is complete, exactly one remaining call to `setCustomEmoji` exists — in the Modal.Footer `onClick` handler:
```ts
onClick={() => { setShowAddItemModal(false); setSelectedListId(null); setError(""); setCustomCategory(""); setCustomEmoji(""); setUseCustomCategory(false); }}
```

Change `setCustomEmoji("")` to `setCustomIconName("")` in that handler. The inline cancel button was already updated in Step 8.

- [ ] **Step 10: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors. If you see "Property 'customEmoji' does not exist" errors, you missed a replacement.

- [ ] **Step 11: Commit**

```bash
git add src/app/\[locale\]/trips/\[tripId\]/packing/page.tsx
git commit -m "feat: replace emoji input with icon picker in packing form"
```

---

## Task 5: Packing page — editable icon on custom category headers

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/packing/page.tsx`

- [ ] **Step 1: Add `editingCategoryIcon` state (near the other state declarations, around line 113)**

```ts
const [editingCategoryIcon, setEditingCategoryIcon] = useState<string | null>(null);
```

- [ ] **Step 2: Update the category section header render (around line 870)**

Find the block starting with:
```tsx
{groupItemsByCategory(list.items).map(([category, items]) => {
  const CategoryIcon = getCategoryIcon(category);
  const categoryLabel = allKnownKeys.has(category)
    ? t(`packing.categories.${category}`)
    : category;
  return (
    <div key={category}>
      <div className="flex items-center gap-2 mb-2 px-1">
        <CategoryIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {categoryLabel}
        </span>
      </div>
```

Replace with:
```tsx
{groupItemsByCategory(list.items).map(([category, items]) => {
  const isCustom = !allKnownKeys.has(category);
  const CategoryIcon = isCustom
    ? getPackingIcon(customCategoryMap.get(category) ?? null)
    : getCategoryIcon(category);
  const categoryLabel = isCustom ? category : t(`packing.categories.${category}`);
  const editKey = `${list.id}-${category}`;
  return (
    <div key={category}>
      <div className="flex items-center gap-2 mb-2 px-1">
        {isCustom ? (
          <button
            type="button"
            title="Change icon"
            onClick={() => setEditingCategoryIcon(editingCategoryIcon === editKey ? null : editKey)}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
          </button>
        ) : (
          <CategoryIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
        )}
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {categoryLabel}
        </span>
      </div>
      {isCustom && editingCategoryIcon === editKey && (
        <div className="mb-3 px-1">
          <PackingIconPicker
            selected={customCategoryMap.get(category) ?? ""}
            onChange={async (iconName) => {
              setEditingCategoryIcon(null);
              const res = await fetch(`/api/trips/${tripId}/packing/category`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category, iconName }),
              });
              if (res.ok) {
                fetchLists();
              } else {
                toast.error(t("common.error"));
              }
            }}
          />
        </div>
      )}
```

Note: the `editKey` uses both list ID and category name so the same custom category name in different lists each has its own independent edit state.

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Full build check**

Run: `npm run build`
Expected: build completes successfully with no TypeScript errors

- [ ] **Step 5: Manual browser test**

1. Open a trip's packing page
2. Click "Add item" → select "Custom category"
3. Verify the icon grid appears (20 icons, 6 per row on mobile)
4. Click an icon — verify it highlights in indigo and the preview button updates
5. Fill in a category name and submit
6. Verify the new category header shows the Lucide icon (not an emoji span)
7. Click the icon in the category header → verify the picker opens inline
8. Select a different icon → verify it closes and the header updates after re-fetch

- [ ] **Step 6: Commit**

```bash
git add src/app/\[locale\]/trips/\[tripId\]/packing/page.tsx
git commit -m "feat: editable icon on custom packing category headers"
```
