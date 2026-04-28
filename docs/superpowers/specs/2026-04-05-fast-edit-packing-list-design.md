# Fast Edit Mode for Packing Lists

**Date:** 2026-04-05  
**Status:** Approved

## Overview

Add a "text edit mode" to each packing list that lets users type the entire list as a plain-text outline — category names flush left, items indented — with a live preview on the right. This is an additive feature; the existing list UI is untouched.

## User Experience

A pencil/edit button labelled **"Edit as text"** appears in the packing list header (alongside the existing kebab menu). Clicking it replaces that list card's contents with a split-panel editor; only one list can be in edit mode at a time (parent tracks `editingListId: string | null`). Clicking **Cancel** restores the normal view with no changes. Clicking **Save Changes** replaces all items in the list with the parsed result.

### Data Loss Warning

Entering edit mode and saving **always** replaces all items with new rows. `isPacked` state and `claimedBy` assignments are lost on every save, even if the user makes no text changes.

The `categoryEmoji` column stores icon name strings (keys from `PACKING_ICON_MAP` in `src/lib/packingIcons.ts`, e.g. `"Shirt"`, `"Camera"`) — not literal emoji. These are reset to `null` on every save and can be reassigned via the existing icon picker after saving. Note: `PACKING_ICON_MAP` (icon picker map: icon name → LucideIcon) is a separate constant from `CATEGORY_ICON` (category slug → LucideIcon), which is only used for the preview.

- When the user clicks **"Edit as text"** on a list that has any packed or claimed items, show an inline banner: _"Saving in text mode will reset packed status and claims."_ Evaluated once on entry; not re-evaluated dynamically.
- The save confirmation dialog always shows: _"This will replace all items. Packed status and claims will be reset."_ with a confirm button.

### Text Format

```
Clothing
  T-shirts x3
  Pants x2
  Rain jacket

Toiletries
  Toothbrush
  Shampoo x2
```

Rules:
- **Category line**: any line with no leading whitespace. Normalised to lowercase before storage.
- **Item line**: any line with leading whitespace (spaces or tab), belonging to the most recent category.
- **Quantity**: check for a trailing `x<N>` token (entire last word, N a positive integer, not part of a hyphenated string like `3-in-1`). If found, strip it and use N. Otherwise check for a leading `<N>x` token (entire first word). If found, strip it and use N. Trailing wins — if both are present, only the trailing token is consumed and the leading token stays in the name. Defaults to 1. Examples: `Vitamin C x2` → name `Vitamin C`, qty 2. `2x Socks` → name `Socks`, qty 2. `2x Socks x3` → name `2x Socks`, qty 3. `3-in-1 shampoo` → name `3-in-1 shampoo`, qty 1.
- **Orphaned items** (item before any category line): assigned to category `"other"`. Advisory warning only; saving is allowed.
- **Empty lines**: ignored.
- **Unknown category names**: stored as custom categories; no icon in the preview.
- **Known category names**: matched case-insensitively against `CATEGORY_ICON`; the corresponding icon is shown in the preview.

### Text Serialisation (list → text)

Existing items serialised when entering edit mode. Categories appear in order of their first item's `createdAt`. Items within each category are ordered `createdAt asc`. Category names are emitted as stored (always lowercase). Quantity 1 is omitted for brevity. An empty list serialises to an empty string.

```
clothing
  T-shirts x3
  Pants x2

electronics
  Charger x2
  Power bank
```

### Split Panel Layout

| Panel | Content |
|-------|---------|
| **Left (Edit)** | Plain `<textarea>` with monospace font. Full height of the editor area. |
| **Right (Preview)** | Live-rendered preview — category header with icon, item rows with quantity. Single debounce path (~150 ms). Inside the debounce, if raw line count > 300, rendering is skipped and _"Too many lines to preview"_ is shown. The 300-line threshold is intentionally higher than the 200-item save limit to allow for category headers and blank lines. |

### Additional UI Elements

- **Syntax hint bar** (above the split): _"Category on its own line · Items indented · Quantity: x2 or 2x"_
- **Status bar** (below the split): `✓ N categories · M items parsed` in green. Orphaned item count in amber (advisory). If `M > 200`: count turns amber, Save button disabled (_"200 item limit reached"_) — confirmation dialog not shown.
- **Save confirmation**: reachable only when `M ≤ 200`. Shows: _"This will replace all items. Packed status and claims will be reset."_

## Architecture

### `CATEGORY_ICON` — Module-level Export

`CATEGORY_ICON` is currently defined inside `PackingPage`'s component function. Extract it to `src/lib/packingCategories.ts` (new file) so `PackingFastEditor` can import it directly. `PackingPage` imports it from there.

```ts
// src/lib/packingCategories.ts
export const CATEGORY_ICON: Record<string, LucideIcon> = {
  clothing: Shirt,
  toiletries: Droplets,
  // ... (same entries currently in page.tsx)
};
```

This is a separate constant from `PACKING_ICON_MAP` in `src/lib/packingIcons.ts`.

### New Component: `PackingFastEditor`

Self-contained component in `src/components/PackingFastEditor.tsx`. The textarea is isolated so it can be swapped for a richer editor in a future iteration without touching the parse/save logic.

**Props:**
```ts
interface PackingFastEditorProps {
  list: PackingList; // includes items array; used for serialisation and packed/claimed detection
  tripId: string;
  onSave: () => void;   // parent exits edit mode and calls fetchLists()
  onCancel: () => void; // parent restores normal view
}
```

`PackingFastEditor` does not manage its own visibility. It calls `onSave` or `onCancel` to signal the parent.

**Internal state:** `text: string`, `parsed: ParsedItem[]`, `showSaveConfirm: boolean`, `isSaving: boolean`.

### Text Parser

Pure function `parsePackingText(text: string): ParsedItem[]` in `src/lib/parsePackingText.ts`:

```ts
interface ParsedItem {
  name: string;
  quantity: number;
  category: string; // lowercase; "other" for orphaned items
}
```

### Save Flow

1. Call `parsePackingText(text)`.
2. Send `PUT /api/trips/[tripId]/packing/[listId]/bulk`.
3. On success, call `onSave()`. Component does nothing further.

### New API Endpoint: `PUT /api/trips/[tripId]/packing/[listId]/bulk`

Route file: `src/app/api/trips/[tripId]/packing/[listId]/bulk/route.ts`.

**Routing:** Matches `.../packing/<uuid>/bulk`. The existing `packing/items/route.ts` matches `.../packing/items` — a different URL, no conflict. (If a request were somehow made to `.../packing/items/bulk`, Next.js App Router gives precedence to the static `items` folder over the dynamic `[listId]` segment, so the new route would not match.)

**Request body:**
```json
{
  "items": [
    { "name": "T-shirts", "quantity": 3, "category": "clothing" },
    { "name": "Toothbrush", "quantity": 1, "category": "toiletries" }
  ]
}
```

**Handler sequence:**

1. **Auth check** — valid session required; 401 otherwise.
2. **Resource check** — fetch the packing list by `listId`, selecting `id`, `tripId`, `name`, `createdById`. Return 404 if not found or if `list.tripId !== tripId`.
3. **Permission check** (before the transaction) — call `canModifyItem(tripId, session.user.id, list.createdById)` from `src/lib/permissions.ts`. This returns true for the list creator and for trip members with OWNER or ADMIN role (no private-list gate; MEMBER role non-creators cannot use this endpoint). Return 403 if denied.
4. **Zod validation** — each item: `name` (non-empty, max 100 chars), `quantity` (int ≥ 1), `category` (required string, max 50 chars). Array max 200 items; 400 if exceeded.
5. **Transaction** — `prisma.$transaction`: `deleteMany` existing items for `listId`, then `createMany` with new items (`categoryEmoji: null` always).
6. **Activity log** — fire-and-forget after the transaction: `createActivity({ tripId, userId: session.user.id, action: "bulk_edited", entityType: "packing", entityId: listId, entityName: list.name }).catch(() => {})`.
7. **Response** — `{ items: PackingItem[] }`, status 200.

## Error Handling

- Orphaned items → `"other"` category, advisory status bar warning; saving allowed.
- `M > 200`: Save disabled client-side; API returns 400 if bypassed.
- 401 (session expired): `toast.error`; no special redirect — next navigation handles auth.
- Other API errors: `toast.error`.
- Empty text: valid — saves an empty list.

## Out of Scope

- Undo/redo.
- Drag-to-reorder.
- Syntax highlighting / rich editor (textarea is swappable).
- Mobile stacked layout (future enhancement).
