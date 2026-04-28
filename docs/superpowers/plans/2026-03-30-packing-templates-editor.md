# Packing List Templates Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to create and manage reusable packing list templates outside of any trip, with the full packing editor experience, accessible from the Templates → Packing tab.

**Architecture:** Each user gets a hidden "template store" trip (`isTemplateStore: true`) created lazily via `GET /api/user/template-store`. All existing packing APIs work unchanged against this tripId. A new editor page at `/[locale]/templates/packing/[tripId]` provides the full editor without item claiming. Activity logging and push notifications are suppressed server-side for template store trips.

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, TypeScript, next-intl, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-30-packing-templates-editor-design.md`

---

## File Map

**New files:**
- `src/app/api/user/template-store/route.ts` — GET: find or create the user's template store trip
- `src/app/[locale]/templates/packing/[tripId]/page.tsx` — full template editor page

**Modified files:**
- `prisma/schema.prisma` — add `isTemplateStore` to Trip, `tripCategory` to PackingList
- `src/lib/db/trips.ts` — filter `isTemplateStore: false` from `getUserTrips`
- `src/app/api/user/export/route.ts` — filter `isTemplateStore: false` from trip export query
- `src/app/api/trips/[tripId]/packing/route.ts` — suppress activity/notifications for template store; add `tripCategory` to PATCH handler
- `src/app/api/trips/[tripId]/packing/items/route.ts` — suppress activity/notifications for template store
- `src/app/api/packing-templates/route.ts` — update type filter to JS post-filter using `tripCategory`
- `src/app/[locale]/templates/page.tsx` — add "My Templates" section above community browser
- `messages/en.json` — add translation keys
- `messages/de.json` — add translation keys

---

## Task 1: Schema — add isTemplateStore and tripCategory

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `isTemplateStore` to the Trip model**

In `prisma/schema.prisma`, find the `Trip` model. After the `isBucketList Boolean @default(false)` line, add:

```prisma
isTemplateStore Boolean @default(false)
```

- [ ] **Step 2: Add `tripCategory` to the PackingList model**

In `prisma/schema.prisma`, find the `PackingList` model. After the `templateDescription String? @db.Text` line, add:

```prisma
tripCategory String? // trip category override for community template filtering
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name add_packing_template_store
```

When prompted for the migration name, the `--name` flag handles it. Expected output: migration created and applied, Prisma client regenerated.

- [ ] **Step 4: Add the partial unique index to the migration SQL**

Open the generated migration file at `prisma/migrations/[timestamp]_add_packing_template_store/migration.sql` and append before the final line:

```sql
-- Partial unique index: at most one template store per user
CREATE UNIQUE INDEX "trips_owner_template_store_unique"
  ON "Trip" ("ownerId")
  WHERE "isTemplateStore" = true;
```

Then apply it:

```bash
npx prisma db execute --schema prisma/schema.prisma --stdin <<'SQL'
CREATE UNIQUE INDEX IF NOT EXISTS "trips_owner_template_store_unique"
  ON "Trip" ("ownerId")
  WHERE "isTemplateStore" = true;
SQL
```

- [ ] **Step 5: Validate schema**

```bash
npx prisma validate
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add isTemplateStore to Trip and tripCategory to PackingList"
```

---

## Task 2: Filter template store trips from all listings

**Files:**
- Modify: `src/lib/db/trips.ts`
- Modify: `src/app/api/user/export/route.ts`

- [ ] **Step 1: Filter getUserTrips**

In `src/lib/db/trips.ts`, find the `getUserTrips` function. The `where` clause currently has `isBucketList: false`. Add `isTemplateStore: false` alongside it:

```typescript
where: {
  isBucketList: false,
  isTemplateStore: false,
  OR: [
    { ownerId: userId },
    { members: { some: { userId } } },
  ],
},
```

Note: `GET /api/trips` (at `src/app/api/trips/route.ts`) delegates entirely to `getUserTrips` — it is covered by this change and requires no separate modification.

- [ ] **Step 2: Filter export route**

In `src/app/api/user/export/route.ts`, find the `prisma.trip.findMany` call. Add `isTemplateStore: false` to its `where` clause:

```typescript
where: {
  isTemplateStore: false,
  OR: [{ ownerId: userId }, { members: { some: { userId } } }],
},
```

Also add `isTemplateStore: true` to the `select` block so exports correctly reflect the field exists (but template store trips are excluded).

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/db/trips.ts src/app/api/user/export/route.ts
git commit -m "feat: filter template store trips from all trip listings"
```

---

## Task 3: Template store API route

**Files:**
- Create: `src/app/api/user/template-store/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Find existing template store trip
  let trip = await prisma.trip.findFirst({
    where: { ownerId: userId, isTemplateStore: true },
    select: { id: true },
  });

  if (!trip) {
    try {
      trip = await prisma.trip.create({
        data: {
          name: "Personal Templates",
          ownerId: userId,
          isTemplateStore: true,
          currency: "EUR",
          members: {
            create: { userId, role: "OWNER" },
          },
        },
        select: { id: true },
      });
    } catch (err: unknown) {
      // Partial unique index violation: another request created it concurrently
      const isUniqueError =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code: string }).code === "P2002";
      if (isUniqueError) {
        trip = await prisma.trip.findFirst({
          where: { ownerId: userId, isTemplateStore: true },
          select: { id: true },
        });
      } else {
        throw err;
      }
    }
  }

  if (!trip) {
    return NextResponse.json({ error: "Failed to get template store" }, { status: 500 });
  }

  return NextResponse.json({ tripId: trip.id });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/template-store/route.ts
git commit -m "feat: add template store API route"
```

---

## Task 4: Update packing-templates type filter

**Files:**
- Modify: `src/app/api/packing-templates/route.ts`

- [ ] **Step 1: Read the current file**

Read `src/app/api/packing-templates/route.ts` to confirm the current structure before editing.

- [ ] **Step 2: Update the query and filter**

The current code filters by `trip: { type }` in the Prisma `where`. Replace the entire `GET` handler:

```typescript
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const type = searchParams.get("type");

    const templates = await prisma.packingList.findMany({
      where: {
        isTemplate: true,
        isPrivate: false,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { templateDescription: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
        // Note: type filter moved to JS post-filter below (supports tripCategory override)
      },
      include: {
        _count: { select: { items: true } },
        trip: { select: { type: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ templateUseCount: "desc" }, { createdAt: "desc" }],
    });

    // Post-filter by type: use tripCategory if set, otherwise fall back to trip.type
    const filtered = type
      ? templates.filter((t) => (t.tripCategory ?? t.trip?.type) === type)
      : templates;

    return NextResponse.json({ templates: filtered });
  } catch (error) {
    console.error("Get packing templates error:", error);
    return NextResponse.json(
      { error: "Failed to fetch packing templates" },
      { status: 500 }
    );
  }
}
```

Note: the `PackingList` model now has `tripCategory` — Prisma will include it in the result automatically. If the TypeScript type complains, add it to the interface or use `(t as { tripCategory?: string | null; trip?: { type?: string | null } } & typeof t)`.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/packing-templates/route.ts
git commit -m "feat: update packing-templates type filter to support tripCategory"
```

---

## Task 5: Suppress side-effects and add tripCategory to packing route

**Files:**
- Modify: `src/app/api/trips/[tripId]/packing/route.ts`

- [ ] **Step 1: Read the current file**

Read `src/app/api/trips/[tripId]/packing/route.ts` in full to confirm current structure.

- [ ] **Step 2: Suppress createActivity and sendTripNotifications in POST handler**

In the POST handler, the trip is already fetched via `getTripById`. After the `list` is created, the code calls `createActivity(...)` and `sendTripNotifications(...)`. Wrap both in a guard:

```typescript
if (!trip.isTemplateStore) {
  createActivity({
    tripId,
    userId: session.user.id,
    action: "created",
    entityType: "packing",
    entityId: list.id,
    entityName: list.name,
  }).catch(() => {});
  sendTripNotifications(tripId, session.user.id, "packing", list.name, "created");
}
```

- [ ] **Step 3: Suppress createActivity in DELETE handler**

The DELETE handler (line 176) does NOT have access to `tripId` from route params — it fetches the packing list from the DB using the list ID. Update the `findUnique` query at line 191 to also fetch the trip's `isTemplateStore`:

```typescript
const existing = await prisma.packingList.findUnique({
  where: { id },
  select: {
    tripId: true,
    createdById: true,
    trip: { select: { isTemplateStore: true } },
  },
});
```

Then wrap the `createActivity` call with a guard:

```typescript
if (!existing.trip?.isTemplateStore) {
  createActivity({
    tripId: deleted.tripId,
    userId: session.user.id,
    action: "deleted",
    entityType: "packing",
    entityId: deleted.id,
    entityName: deleted.name,
  }).catch(() => {});
}
```

- [ ] **Step 4: Add tripCategory to PATCH handler**

In the PATCH handler, the body is destructured as `{ id, isTemplate, templateDescription }`. Add `tripCategory`:

```typescript
const { id, isTemplate, templateDescription, tripCategory } = body as {
  id: string;
  isTemplate: boolean;
  templateDescription?: string | null;
  tripCategory?: string | null;
};
```

Add it to the `prisma.packingList.update` data block:

```typescript
data: {
  isTemplate,
  templateDescription: templateDescription ?? null,
  ...(tripCategory !== undefined ? { tripCategory: tripCategory ?? null } : {}),
},
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/trips/[tripId]/packing/route.ts
git commit -m "feat: suppress side-effects for template store and add tripCategory to packing PATCH"
```

---

## Task 6: Suppress side-effects in packing items route

**Files:**
- Modify: `src/app/api/trips/[tripId]/packing/items/route.ts`

- [ ] **Step 1: Read the current file**

Read `src/app/api/trips/[tripId]/packing/items/route.ts` to confirm the POST handler structure.

- [ ] **Step 2: Fetch isTemplateStore alongside tripId**

In the POST handler, after the item is created, the code fetches the packing list to get `tripId`. Update this query to also fetch the trip's `isTemplateStore`:

```typescript
const packingList = await prisma.packingList.findUnique({
  where: { id: body.listId },
  select: {
    tripId: true,
    trip: { select: { isTemplateStore: true } },
  },
});
if (packingList) {
  if (!packingList.trip?.isTemplateStore) {
    createActivity({
      tripId: packingList.tripId,
      userId: session.user.id,
      action: "created",
      entityType: "packing",
      entityId: item.id,
      entityName: item.name,
    }).catch(() => {});
    sendTripNotifications(packingList.tripId, session.user.id, "packing", item.name, "created");
  }
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trips/[tripId]/packing/items/route.ts
git commit -m "feat: suppress activity/notifications for template store in packing items route"
```

---

## Task 7: Template editor page

**Files:**
- Create: `src/app/[locale]/templates/packing/[tripId]/page.tsx`

This page is based on the in-trip packing page (`src/app/[locale]/trips/[tripId]/packing/page.tsx`) with these differences:
- No TripNav
- Different header ("My Packing Templates" + back link)
- No item claiming (no `handleToggleClaim`, no claim button, no "Yours" badge)
- `?list=[listId]` URL param auto-expands that list on mount
- Publish modal has a `tripCategory` dropdown

- [ ] **Step 1: Read the in-trip packing page**

Read `src/app/[locale]/trips/[tripId]/packing/page.tsx` in full to understand the complete structure before creating the template editor.

- [ ] **Step 2: Create the template editor page**

Create `src/app/[locale]/templates/packing/[tripId]/page.tsx` with the following structure (adapt the exact JSX from the in-trip packing page):

```typescript
"use client";

// Same imports as packing/page.tsx, minus TripNav
// Add: import { useSearchParams } from "next/navigation";
// Add: import { useLocale } from "next-intl";
// Add LocaleLink for the back button

export default function TemplatePackingEditorPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const searchParams = useSearchParams();
  const locale = useLocale();
  const focusListId = searchParams.get("list"); // auto-expand this list

  // All state and handlers from packing/page.tsx EXCEPT:
  // - Remove: handleToggleClaim function
  // - Add: tripCategory state for publish modal

  const [publishTripCategory, setPublishTripCategory] = useState<string>("");

  // Modify handlePublish to include tripCategory:
  async function handlePublish() {
    // ... same as original but add tripCategory to body:
    body: JSON.stringify({
      id: publishListId,
      isTemplate: true,
      templateDescription: publishDescription || null,
      tripCategory: publishTripCategory || null,
    }),
  }

  // On mount, auto-expand the list from URL param:
  useEffect(() => {
    if (focusListId) {
      setExpandedListId(focusListId); // use whatever state var controls expanded list
    }
  }, [focusListId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <AppHeader />
      {/* No AppNav or TripNav */}

      {/* Header */}
      <div className="px-4 md:px-8 py-6">
        <LocaleLink
          href="/templates?tab=packing"
          className="text-sm text-gray-400 hover:text-white mb-4 inline-flex items-center gap-1"
        >
          ← {t("templates.backToPacking")}
        </LocaleLink>
        <h1 className="text-3xl font-black tracking-tight">
          {t("templates.myPackingTemplates")}
        </h1>
      </div>

      {/* Same packing list editor UI as in-trip packing page, MINUS item claim buttons */}
      {/* ... */}

      {/* Publish modal — same as original, plus trip category dropdown */}
    </div>
  );
}
```

Key items to **remove** from the in-trip version:
- `TripNav` import and usage
- `handleToggleClaim` function
- Claim button (`onClick={() => handleToggleClaim(...)}`)
- "Yours" badge (`{item.claimedBy?.id === session.user.id && ...}`)
- "Claimed by [name]" text

Key items to **add**:
- Back link to `/templates?tab=packing`
- `publishTripCategory` state
- Trip type dropdown in publish modal (see Step 3)
- Auto-expand logic from `?list=` param

- [ ] **Step 3: Add tripCategory dropdown to publish modal**

In the publish modal JSX, after the `templateDescription` textarea, add:

```tsx
<div>
  <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 block">
    {t("templates.tripType")} <span className="text-gray-600">({t("templates.optional")})</span>
  </Label>
  <select
    value={publishTripCategory}
    onChange={(e) => setPublishTripCategory(e.target.value)}
    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white"
  >
    <option value="">{t("templates.anyTripType")}</option>
    <option value="city">{t("trips.types.city")}</option>
    <option value="beach">{t("trips.types.beach")}</option>
    <option value="camping">{t("trips.types.camping")}</option>
    <option value="hiking">{t("trips.types.hiking")}</option>
    <option value="skiing">{t("trips.types.skiing")}</option>
    <option value="cycling">{t("trips.types.cycling")}</option>
    <option value="road">{t("trips.types.road")}</option>
    <option value="cruise">{t("trips.types.cruise")}</option>
    <option value="other">{t("trips.types.other")}</option>
  </select>
</div>
```

Reset `publishTripCategory` to `""` when the publish modal is closed/reset.

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/templates/packing/
git commit -m "feat: add packing template editor page"
```

---

## Task 8: My Templates section on the templates page

**Files:**
- Modify: `src/app/[locale]/templates/page.tsx`

- [ ] **Step 1: Read the current templates page packing tab section**

Read lines 129–350 of `src/app/[locale]/templates/page.tsx` to understand the current tab structure and state patterns.

- [ ] **Step 2: Add state for My Templates**

Near the other packing state variables (around line 148), add:

```typescript
const [myPackingLists, setMyPackingLists] = useState<PackingTemplate[]>([]);
const [myPackingLoading, setMyPackingLoading] = useState(false);
const [templateStoreTripId, setTemplateStoreTripId] = useState<string | null>(null);
const [myPackingDeleting, setMyPackingDeleting] = useState<string | null>(null);
```

- [ ] **Step 3: Add fetchMyPackingLists function**

After the existing `fetchPackingTemplates` function, add:

```typescript
async function fetchMyPackingLists() {
  if (!session?.user) return;
  setMyPackingLoading(true);
  try {
    const storeRes = await fetch("/api/user/template-store");
    if (!storeRes.ok) return;
    const { tripId } = await storeRes.json();
    setTemplateStoreTripId(tripId);

    const listsRes = await fetch(`/api/trips/${tripId}/packing`);
    if (!listsRes.ok) return;
    const data = await listsRes.json();
    setMyPackingLists(data.lists ?? []);
  } catch (e) {
    console.error(e);
  } finally {
    setMyPackingLoading(false);
  }
}
```

- [ ] **Step 4: Fetch on tab activation**

In the `useEffect` that fires when `activeMainTab === "packing"` (around line 174), also call `fetchMyPackingLists()`:

```typescript
useEffect(() => {
  if (session && activeMainTab === "packing") {
    fetchPackingTemplates();
    fetchMyPackingLists();
  }
}, [session, activeMainTab, packingTypeFilter]);
```

- [ ] **Step 5: Add handleNewTemplate function**

```typescript
async function handleNewTemplate() {
  if (!session?.user) return;
  try {
    const storeRes = await fetch("/api/user/template-store");
    if (!storeRes.ok) return;
    const { tripId } = await storeRes.json();

    const listRes = await fetch(`/api/trips/${tripId}/packing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: t("templates.newTemplateDefaultName"), isPrivate: false }),
    });
    if (!listRes.ok) return;
    const { list } = await listRes.json();

    router.push(`/${locale}/templates/packing/${tripId}?list=${list.id}`);
  } catch (e) {
    console.error(e);
  }
}
```

- [ ] **Step 6: Add handleDeleteMyTemplate function**

```typescript
async function handleDeleteMyTemplate(listId: string, tripId: string) {
  setMyPackingDeleting(listId);
  try {
    const res = await fetch(`/api/trips/${tripId}/packing`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: listId }),
    });
    if (!res.ok) throw new Error("Delete failed");
    setMyPackingLists((prev) => prev.filter((l) => l.id !== listId));
  } catch (e) {
    console.error(e);
  } finally {
    setMyPackingDeleting(null);
  }
}
```

- [ ] **Step 7: Add My Templates section to packing tab JSX**

In the packing tab render section, before the community template browser, add:

```tsx
{/* My Templates */}
<div className="mb-10">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg font-black uppercase tracking-wider">
      {t("templates.myPackingTemplates")}
    </h2>
    <button
      onClick={handleNewTemplate}
      className="text-xs font-bold uppercase tracking-wider px-4 py-2 bg-teal-500 hover:bg-teal-400 text-black rounded transition-colors"
    >
      + {t("templates.newTemplate")}
    </button>
  </div>

  {myPackingLoading ? (
    <p className="text-gray-500 text-sm">{t("common.loading")}</p>
  ) : myPackingLists.length === 0 ? (
    <p className="text-gray-500 text-sm">{t("templates.noPersonalTemplates")}</p>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {myPackingLists.map((list) => (
        <Card key={list.id} className="p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-sm">{list.name}</p>
              <p className="text-xs text-gray-400">
                {list._count?.items ?? 0} {t("templates.items")}
              </p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              list.isTemplate ? "bg-teal-500/20 text-teal-400" : "bg-white/10 text-gray-400"
            }`}>
              {list.isTemplate ? t("templates.public") : t("templates.private")}
            </span>
          </div>
          <div className="flex gap-2 mt-auto">
            <button
              onClick={() => templateStoreTripId && router.push(`/${locale}/templates/packing/${templateStoreTripId}?list=${list.id}`)}
              className="flex-1 text-xs font-bold py-1.5 border border-white/10 hover:border-white/30 rounded transition-colors"
            >
              {t("common.edit")}
            </button>
            <button
              onClick={() => templateStoreTripId && handleDeleteMyTemplate(list.id, templateStoreTripId)}
              disabled={myPackingDeleting === list.id}
              className="text-xs font-bold py-1.5 px-3 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
            >
              {t("common.delete")}
            </button>
          </div>
        </Card>
      ))}
    </div>
  )}
</div>

{/* Community Templates heading */}
<h2 className="text-lg font-black uppercase tracking-wider mb-4">
  {t("templates.communityTemplates")}
</h2>
```

- [ ] **Step 8: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 9: Commit**

```bash
git add src/app/[locale]/templates/page.tsx
git commit -m "feat: add My Templates section to templates packing tab"
```

---

## Task 9: Translations

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`

- [ ] **Step 1: Add keys to en.json**

In the `"templates"` section of `messages/en.json`, add:

```json
"myPackingTemplates": "My Packing Templates",
"newTemplate": "New Template",
"newTemplateDefaultName": "New Packing Template",
"noPersonalTemplates": "No personal templates yet. Create one to get started.",
"communityTemplates": "Community Templates",
"items": "items",
"public": "Public",
"private": "Private",
"backToPacking": "Back to Templates",
"tripType": "Trip type",
"anyTripType": "Any type",
"optional": "optional"
```

Check if `"common.edit"` and `"common.delete"` already exist in `messages/en.json`. If not, add them to the `"common"` section.

- [ ] **Step 2: Add keys to de.json**

In the `"templates"` section of `messages/de.json`, add the German equivalents:

```json
"myPackingTemplates": "Meine Packlistenvorlagen",
"newTemplate": "Neue Vorlage",
"newTemplateDefaultName": "Neue Packlistenvorlage",
"noPersonalTemplates": "Noch keine eigenen Vorlagen. Erstelle eine, um loszulegen.",
"communityTemplates": "Community-Vorlagen",
"items": "Einträge",
"public": "Öffentlich",
"private": "Privat",
"backToPacking": "Zurück zu Vorlagen",
"tripType": "Reiseart",
"anyTripType": "Alle Reisearten",
"optional": "optional"
```

- [ ] **Step 3: Verify no missing translation warnings**

Run the dev server briefly and navigate to the templates page — check the console for `MISSING_MESSAGE` warnings.

- [ ] **Step 4: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "feat: add translations for packing template editor"
```

---

## Task 10: Deploy

- [ ] **Step 1: Run full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Deploy to Pi**

```bash
bash deploy.sh
```

- [ ] **Step 3: Verify My Templates section appears on trippla.de/templates?tab=packing**

- [ ] **Step 4: Verify creating a new template navigates to the editor**

- [ ] **Step 5: Verify the editor works (add items, categories, publish with trip type)**

- [ ] **Step 6: Verify published templates appear in the community browser with correct type filter**
