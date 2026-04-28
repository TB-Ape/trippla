# UX Fixes — Design Spec

Date: 2026-03-23

## Overview

Five UX improvements across the packing page and trips list page. All changes are frontend-only except fix 3, which reuses the existing PATCH endpoint at `/api/trips/[tripId]/packing/items`.

---

## Fix 1: Group packing items by category

**Problem:** Items within a packing list are displayed in insertion order. With many items, unrelated categories are mixed together, making it hard to scan.

**Solution:** Client-side grouping in the render function. Items are grouped by their `category` field and sorted alphabetically by name within each group. Each group gets a header showing the category icon and translated label.

**Scope:** Applies to shared list cards only. The "My Items" section is an aggregation across lists and remains flat (grouping it adds complexity for marginal benefit, since it's already a personal focused view).

**Implementation:**
- In `packing/page.tsx`, before rendering `list.items` in the shared list cards, compute a grouped structure: `Map<string, PackingItem[]>` keyed by category
- Sort groups alphabetically by their display label. Known categories use `t(`packing.categories.${key}`)`. Custom categories (those not in `CATEGORY_ICON`) have no translation key — use the raw category string as their label directly (consistent with how `CATEGORIES` is already built in the file)
- Sort items within each group alphabetically by name
- Render a small category header row (category icon + label in uppercase, muted color) before each group
- No API or DB changes required

---

## Fix 2: Visual progress bar on packing lists

**Problem:** Progress is shown as plain text ("8/20 packed · 5/20 claimed"), easy to miss when scanning multiple lists.

**Solution:** Add a thin (4px) teal progress bar below the stats text in each list header. Width = `(packedItems / totalItems) * 100%`. When `totalItems === 0`, show an empty bar (0% width). Apply to both the "My Items" section and shared lists.

**Implementation:**
- Shared lists: use the existing `getListStats()` helper which returns `{ totalItems, packedItems, claimedItems }`. Compute the percentage inline: `totalItems > 0 ? (packedItems / totalItems) * 100 : 0`
- "My Items" section: `getListStats()` is not applicable here (no single `PackingList` object). Compute directly from the `myItems` array: `myItems.length > 0 ? (myItems.filter(i => i.isPacked).length / myItems.length) * 100 : 0`
- Render a `<div>` with a fixed height of 4px, background `rgba(255,255,255,0.08)`, containing an inner `<div>` whose width is set to the computed percentage with a teal gradient (`from-teal-400 to-cyan-500`), consistent with app theme
- No API or DB changes required

---

## Fix 3: Edit packing items via ··· menu

**Problem:** Items have no edit button. Correcting a typo or changing quantity requires deleting and re-adding the item. The inline Delete button also currently has no permission gate on items (unlike the list-level ··· menu).

**Solution:** Replace the existing inline Delete button on item rows with a ··· overflow menu containing Edit and Delete. The Claim button stays visible outside the menu as a primary action. The ··· menu is gated on `canModify(list.createdBy.id)` — this consolidates permissions consistently and aligns item actions with the existing list-level ··· pattern.

**Behaviour change:** Users without modify rights (not owner, admin, or creator of the list) currently see a Delete button on items. After this change they will see neither Edit nor Delete. This is intentional — the existing unguarded delete was a bug-like oversight.

**Edit modal:** Pre-filled with the item's current `name`, `quantity`, and `category`. On save, sends a PATCH to `/api/trips/[tripId]/packing/items` with the updated fields. Note: this is the `/items` sub-route, not the parent `/packing` route (which has its own PATCH handler for list-level template publishing).

**"My Items" scope:** Item rows in the "My Items" section also have an inline Delete button. Apply the same change there: replace the inline Delete with a ··· menu containing Edit and Delete (no permission gate needed in "My Items" since those items are always owned by the current user or are from their private list).

**Implementation:**
- Add `openMenuItemId: string | null` state to track which item's menu is open
- Add `editingItem: PackingItem | null` and `showEditItemModal: boolean` state
- Shared list item rows: remove the existing inline Delete button; add a ··· button that toggles a dropdown with Edit and Delete; gate the entire ··· button on `canModify(list.createdBy.id)`
- "My Items" item rows: remove the existing inline Delete button; add a ··· button (always visible) with Edit and Delete
- Edit modal: same structure as the Add Item modal (name, quantity, category fields), pre-populated from `editingItem`. Modal title uses translation key `packing.editItemModal`
- `handleEditItem()`: sends `PATCH /api/trips/[tripId]/packing/items` with `{ id, name, quantity, category }`, calls `fetchLists()` on success, and shows a success toast using key `packing.itemUpdated`
- The PATCH endpoint and `updatePackingItemSchema` already support `name`, `quantity`, and `category` as optional fields — no backend changes needed
- Add to `messages/en.json` under `"packing"`: `"editItemModal": "EDIT ITEM"` and `"itemUpdated": "Item updated"`
- Add equivalent German keys to `messages/de.json`: `"editItemModal": "ARTIKEL BEARBEITEN"` and `"itemUpdated": "Artikel aktualisiert"`

---

## Fix 4: Dim your claimed items in shared lists

**Problem:** "My Items" aggregates all items the user has claimed plus private list items. Those same items appear again at full opacity in the shared lists below, making the page feel repetitive.

**Solution:** In shared lists, items where `item.claimedBy?.id === session.user.id` are rendered at reduced opacity (`opacity-50`) with a small "yours" teal badge. This signals "you've got this covered" without removing the item from the shared view (which other members still need to see).

**Implementation:**
- In the shared list item render, check `item.claimedBy?.id === session.user.id`
- If true: wrap the item row in `opacity-50` and add a `"yours"` badge next to the item name (teal, using translation key `packing.yours`)
- Add `"yours": "yours"` to `messages/en.json` and the German equivalent `"yours": "deins"` to `messages/de.json` under the `"packing"` section
- No API or DB changes required

---

## Fix 5: Move "Create Trip" button to page header

**Problem:** The primary action button on the trips list page sits below all trip cards. With 6+ trips, you have to scroll past them to reach it.

**Solution:** Move the "Create Trip" button into the page header, inline with the "Your Trips" title. Remove it from its current position at the bottom.

**Implementation:**
- In `trips/page.tsx`, the current header section (lines ~213–223) wraps `<h1>` and `<p>` in a plain `<div className="mb-8 md:mb-12">` with no flex layout
- Replace that wrapper with `<div className="mb-8 md:mb-12 flex justify-between items-end gap-4 flex-wrap">`
- Move the `<Button onClick={() => setShowCreateModal(true)} variant="gradient" size="lg">` from the bottom container into this header wrapper
- Remove the now-empty bottom `<div className="flex flex-wrap gap-3 mt-8">` container entirely
- No API or DB changes required

---

## Affected Files

- `src/app/[locale]/trips/page.tsx` — fix 5
- `src/app/[locale]/trips/[tripId]/packing/page.tsx` — fixes 1, 2, 3, 4
- `messages/en.json` — fix 3 (`packing.editItemModal`, `packing.itemUpdated`), fix 4 (`packing.yours`)
- `messages/de.json` — fix 3 (`packing.editItemModal`, `packing.itemUpdated`), fix 4 (`packing.yours`)

## Out of Scope

- Drag-to-reorder items within a list
- Bulk actions (mark all packed, etc.)
- Category editing after item creation (categoryEmoji not included in edit modal — keep it simple)
- Grouping items in the "My Items" section (flat view is intentional)
