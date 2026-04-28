# Packing List Icon Picker for Custom Categories — Design Spec

## Overview

Replace the existing small emoji text input for custom packing categories with a curated Lucide icon picker that matches the visual style of the built-in categories. Users can also change the icon of an existing custom category by clicking it in the category header.

## Background

The packing list has built-in categories (Clothing, Toiletries, Electronics, etc.) each rendered with a Lucide icon from a `CATEGORY_ICON` map. Custom categories currently store an emoji character in `categoryEmoji: String?` on each packing item. This spec replaces the emoji text input with a Lucide icon picker and stores the icon name string instead.

## Goals

- Custom categories look identical to built-in categories (same Lucide stroke icons)
- Minimal friction: one click to select an icon when creating a custom category
- Users can change the icon of an existing custom category after creation
- No database schema changes required

## Data Model

No migration needed. The existing `categoryEmoji String?` field on `PackingItem` is repurposed to store a Lucide icon name (e.g. `"Camera"`).

**Render logic:**
- If `categoryEmoji` matches a key in `PACKING_ICON_MAP` → render the corresponding Lucide icon
- Otherwise (legacy emoji, empty, or unknown value) → fall back to `Package` icon

## Icon Set

A curated set of 20 Lucide icons relevant to travel and packing, complementing the existing built-in categories. Note: `Shirt` is also used in the built-in `CATEGORY_ICON` map — that is fine, the two maps are independent.

| Name (string key) | Lucide export | Represents |
|---|---|---|
| `Camera` | `Camera` | photography gear |
| `Utensils` | `Utensils` | food / eating |
| `Music` | `Music` | entertainment |
| `Pill` | `Pill` | medicine |
| `Dumbbell` | `Dumbbell` | fitness |
| `Bike` | `Bike` | cycling |
| `Glasses` | `Glasses` | reading / eyewear |
| `Coffee` | `Coffee` | beverages |
| `Globe` | `Globe` | travel / maps |
| `Book` | `Book` | reading |
| `PawPrint` | `PawPrint` | pets |
| `Gamepad2` | `Gamepad2` | gaming |
| `Sun` | `Sun` | sunscreen / weather |
| `Baby` | `Baby` | kids |
| `Heart` | `Heart` | health / personal |
| `Star` | `Star` | favourites / misc |
| `Shirt` | `Shirt` | extra clothing |
| `Backpack` | `Backpack` | bags |
| `Scissors` | `Scissors` | grooming |
| `Phone` | `Phone` | devices |

## Components

### `PackingIconPicker` (new component)

**File:** `src/components/PackingIconPicker.tsx`

Props:
```ts
interface PackingIconPickerProps {
  selected: string;              // icon name e.g. "Camera", or "" for none selected
  onChange: (iconName: string) => void;
}
```

Renders a grid of icon buttons (6 per row on mobile, 8 per row on desktop). Selected icon highlighted with indigo border (`border-indigo-500/70`) and background (`bg-indigo-500/25`). Unselected icons use `text-slate-400` stroke, matching the category header rendering.

No external dependencies beyond existing Lucide icons already imported in the app.

### `PACKING_ICON_MAP` and `getPackingIcon` (new utility)

**File:** `src/lib/packingIcons.ts`

```ts
import { Camera, Utensils, Music, Pill, Dumbbell, Bike, Glasses, Coffee,
         Globe, Book, PawPrint, Gamepad2, Sun, Baby, Heart, Star,
         Shirt, Backpack, Scissors, Phone, Package } from "lucide-react";
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

## UI Changes

### 1. Add-item form — creating a custom category

Replace the current `w-14` emoji text input with `PackingIconPicker`. The picker grid appears above the category name input row. A small preview of the selected icon is shown on the left side of the name input row, same visual treatment as the built-in category icon in the list header.

The `customEmoji` state variable and its setter are removed. A new `customIconName: string` state (default `""`) is added in its place. On form submit, `categoryEmoji: customIconName || undefined` is sent (same field, new value format).

**Before:**
```
[📦 w-14 input] [Category name input         ] [✕]
```

**After:**
```
[Icon grid — 20 icons across 3 rows on mobile]
[◉ Camera icon] [Category name input         ] [✕]
```

**Mobile scroll:** The modal already scrolls. The picker grid (3–4 rows at 36px + gap each) is tall enough to push the name input below the fold on small phones. This is acceptable — the modal scrolls and there is no need to collapse/expand the picker.

### 2. Category section header — editing existing custom categories

When a custom category's header is rendered, the icon is wrapped in a `<button>`. Clicking it opens an inline `PackingIconPicker` directly below the header (no popover library needed — conditionally rendered). Selecting a new icon:
1. Calls `PATCH /api/trips/[tripId]/packing/category` with `{ category, iconName }`
2. On success, calls `fetchLists()` to re-derive `customCategoryMap` from server state (not a direct state mutation — `customCategoryMap` is derived from `lists` at render time)
3. Collapses the picker

Built-in categories have no click handler on their icons and are not editable this way.

**Concurrent edits:** Last-write-wins is acceptable. No conflict detection is needed.

### 3. All custom-icon render sites (must all be updated)

The packing page has multiple sites that currently render `item.categoryEmoji` as a raw `<span>` emoji. After this change, `categoryEmoji` will contain an icon name string. All of these must be updated to use `getPackingIcon`:

| Location | Current code | Updated code |
|---|---|---|
| My items section (~line 654) | `<span>{item.categoryEmoji}</span>` | `<CategoryIcon = getPackingIcon(item.categoryEmoji); <CategoryIcon />` |
| Shared list items section (~line 902) | `<span>{item.categoryEmoji}</span>` | same pattern |
| Import-template preview (~line 1162) | `<span>{item.categoryEmoji}</span>` | same pattern |
| Category section header (~line 871) | `getCategoryIcon(category)` — only covers built-ins | additionally check `customCategoryMap.get(category)` and call `getPackingIcon` for custom categories |

**Editing individual items:** The `handleEditItem` handler does not send `categoryEmoji`. This is intentional — the icon is per-category, not per-item. The implementer should not wire up `customIconName` into the edit-item flow.

## API

### `PATCH /api/trips/[tripId]/packing/category`

**New endpoint** at `src/app/api/trips/[tripId]/packing/category/route.ts`.

**Request body** (validated with Zod):
```ts
const updateCategoryIconSchema = z.object({
  category: z.string().min(1).max(50),
  iconName: z.enum(Object.keys(PACKING_ICON_MAP) as [string, ...string[]]),
});
```

The `iconName` must be a key of `PACKING_ICON_MAP`. Any other value is rejected with 400.

**Authorization:** User must be authenticated and a member of the trip (same check as other packing endpoints).

**Operation:** Updates `categoryEmoji` to `iconName` on all `PackingItem` rows belonging to any list in the trip where `category` equals the given value.

```ts
const { count } = await prisma.packingItem.updateMany({
  where: { list: { tripId }, category: body.category },
  data: { categoryEmoji: body.iconName },
});
```

**Response:** `{ updated: number }` — count of rows updated. Returns 200 even if 0 rows were updated (category might be empty).

## State Changes Summary (packing page)

- Remove: `customEmoji` state, `setCustomEmoji`, the `w-14` emoji `<Input>`
- Add: `customIconName: string` state (default `""`)
- Add: `setCustomIconName` passed to `PackingIconPicker` in the custom category form section
- Update: form submit handler — send `categoryEmoji: customIconName || undefined`
- Update: cancel/reset handler — also reset `customIconName` to `""`
- Add: per-category edit state (e.g. `editingCategoryIcon: string | null`) to track which category header has its picker open

## Backwards Compatibility

Existing custom categories that stored an emoji character will render the `Package` fallback icon (via `getPackingIcon`). Users can click the category header icon to update it to a Lucide icon.

## Out of Scope

- Searching or filtering the icon grid
- Custom icon upload
- Changing icons on built-in categories
- Emoji input as fallback — the text field is removed entirely
- Emoji rendering for the template preview (`~line 1162`) uses the same `getPackingIcon` fallback — old emoji data shows `Package`, which is fine
