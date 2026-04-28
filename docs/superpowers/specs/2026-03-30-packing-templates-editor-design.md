# Packing List Templates Editor — Design Spec

**Date:** 2026-03-30
**Status:** Draft

## Overview

Allow users to create and manage reusable packing list templates outside of any specific trip. Templates can be kept private or published to the community template browser. The full in-trip packing editor experience is available (categories, quantities, custom icons).

## Approach

Each user gets a hidden "template store" trip (`isTemplateStore: true`) created lazily on first use. Personal packing list templates live as normal `PackingList` records inside it. All existing packing APIs work as-is by passing the template store `tripId`. Activity logging and push notifications are suppressed for template store trips server-side.

---

## Schema

### `Trip` model — add one column

```prisma
isTemplateStore Boolean @default(false)
```

- Filtered from all trip listings — the following queries must add `isTemplateStore: false`:
  - `getUserTrips` in `src/lib/db/trips.ts`
  - `GET /api/trips` route
  - `GET /api/user/export` (`src/app/api/user/export/route.ts`) — bare `prisma.trip.findMany` with no template store guard
- Created lazily; `name: "Personal Templates"`, no dates/destination, `ownerId = userId`
- A `TripMember` OWNER row is inserted for the owner at creation time (same pattern as `createTrip`), so all packing API routes that call `getTripById` as an auth gate continue to work without modification
- Race condition prevention: a partial unique index ensures at most one template store per user. This cannot be expressed as a Prisma `@@unique` (which would wrongly constrain all `isTemplateStore: false` rows too). Use a raw migration instead — see Migration section

### `PackingList` model — add one column

```prisma
tripCategory String? // trip category override for community template filtering (e.g. "beach", "camping")
```

- Named `tripCategory` (not `type`) to avoid ambiguity with `Trip.type`
- Only meaningful when `isTemplate: true`
- Set via a "Trip type" dropdown in the publish modal

---

## API

### New route: `GET /api/user/template-store`

- Auth required
- Uses `findFirst` for the user's `isTemplateStore: true` trip; if none found, creates one atomically
- The creation is protected at DB level by the partial unique index — a concurrent second creation will fail with a unique constraint violation, which the route catches and retries with `findFirst`
- Inserts a `TripMember` OWNER row for the user when creating
- Returns `{ tripId: string }`

### Reused routes (no changes)

All `/api/trips/[tripId]/packing*` routes work as-is. The template store trip passes `getTripById` because the owner has a `TripMember` row.

### `GET /api/packing-templates` — update type filter

The existing Prisma filter `trip: { type }` cannot express a null-coalesce across two fields. Updated approach:

1. Fetch all records with `isTemplate: true, isPrivate: false` (no type in Prisma where)
2. Post-filter in JS: `(list.tripCategory ?? list.trip?.type) === filterValue`

This also fixes a pre-existing gap: templates in the template store have no `trip.type`, so with the old filter they were silently excluded from typed searches.

### Suppress side-effects for template store trips

In the following routes, after resolving the trip, add:

```typescript
if (!trip.isTemplateStore) {
  createActivity(...);
  sendTripNotifications(...);
}
```

Routes requiring this guard:
- `POST /api/trips/[tripId]/packing/route.ts` (list creation)
- `DELETE /api/trips/[tripId]/packing/route.ts` (list deletion — currently calls `createActivity` unconditionally)
- `POST /api/trips/[tripId]/packing/items/route.ts` (item creation)

---

## UI

### Templates page — Packing tab (`/[locale]/templates?tab=packing`)

Add a **"My Templates"** section above the existing community browser:

- **"New Template" button** — calls `GET /api/user/template-store`, creates a new packing list via `POST /api/trips/[tripId]/packing`, then navigates to the editor with `?list=[listId]` to pre-select the new list
- **Template cards** per packing list showing: list name, item count, public/private badge, Edit and Delete buttons
- Edit → navigates to `/[locale]/templates/packing/[tripId]?list=[listId]`
- Delete → existing list delete API

Community template browser stays below, unchanged.

### New editor page: `/[locale]/templates/packing/[tripId]`

Shares logic with the in-trip packing page via a `PackingEditor` component extracted from `/trips/[tripId]/packing/page.tsx`. Accepts `mode: "trip" | "template"` prop.

- Shows all packing lists in the template store trip
- If `?list=[listId]` is present, that list is auto-expanded/focused on load
- Header: "My Packing Templates" + back link to `/[locale]/templates?tab=packing` (no TripNav)

Differences from in-trip mode:

| Feature | In-trip | Template editor |
|---|---|---|
| Header | Trip name + TripNav | "My Packing Templates" + back link |
| Item claiming | Yes | No |
| Activity feed / notifications | Yes (server) | Suppressed (server guard above) |
| Publish modal trip type | N/A (uses trip type) | Dropdown → saves as `PackingList.tripCategory` |

### Publish modal — add trip type dropdown

When publishing from the template editor, a **"Trip type"** select appears (same options as trip creation). Stored as `PackingList.tripCategory`. Optional.

---

## Known Risks

- **`getMemberRole` / `canModifyItem`**: return `null` / fall through to `createdById` check for the template store trip. No functional issue for the owner's own operations — `createdById === userId` fires first. Any future code path assuming member rows exist could silently fail.

---

## Out of Scope

- Template versioning
- Collaborative editing of templates
- Sharing personal (private) templates by direct link

---

## Migration

```sql
-- Add isTemplateStore column to Trip
ALTER TABLE "Trip" ADD COLUMN "isTemplateStore" BOOLEAN NOT NULL DEFAULT false;

-- Partial unique index: at most one template store per user
CREATE UNIQUE INDEX "trips_owner_template_store_unique"
  ON "Trip" ("ownerId")
  WHERE "isTemplateStore" = true;

-- Add tripCategory column to PackingList
ALTER TABLE "PackingList" ADD COLUMN "tripCategory" TEXT;
```

Prisma migration name: `add_packing_template_store`
