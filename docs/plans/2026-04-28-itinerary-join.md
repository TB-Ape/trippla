# Itinerary Join Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let trip members join/leave individual itinerary activities so the group can see who's attending each one.

**Architecture:** Add a new `ItineraryParticipant` join table (purely additive), a new `/join` API endpoint, update the existing GET to include participant data, and update the itinerary page to show a join toggle on cards and a full attendee list in the detail modal.

**Tech Stack:** Next.js 15 App Router, Prisma ORM (PostgreSQL), NextAuth, next-intl (i18n), Tailwind CSS, TypeScript

---

### Task 1: Add `ItineraryParticipant` to Prisma schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the new model and back-relations**

In `prisma/schema.prisma`, make three edits:

**a) Add the new model** (after the `Comment` model, before `// Hiking Stages`):

```prisma
model ItineraryParticipant {
  id              String   @id @default(cuid())
  itineraryItemId String
  userId          String
  joinedAt        DateTime @default(now())

  itineraryItem ItineraryItem @relation(fields: [itineraryItemId], references: [id], onDelete: Cascade)
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([itineraryItemId, userId])
  @@index([itineraryItemId])
  @@index([userId])
}
```

**b) Add back-relation to `ItineraryItem`** — after `comments  Comment[]` add:
```prisma
  participants ItineraryParticipant[]
```

**c) Add back-relation to `User`** — after `comments  Comment[]` add:
```prisma
  itineraryParticipations ItineraryParticipant[]
```

**Step 2: Run the migration**

```bash
cd /home/pi/trippla
npx prisma migrate dev --name add_itinerary_participants
```

Expected: migration created and applied, Prisma client regenerated.

**Step 3: Verify schema compiles**

```bash
npx prisma validate
```

Expected: "The schema at prisma/schema.prisma is valid."

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add ItineraryParticipant model"
```

---

### Task 2: Update `getTripItinerary` to include participants

**Files:**
- Modify: `src/lib/db/itinerary.ts`

**Step 1: Update the include block in `getTripItinerary`**

Current `include` in `getTripItinerary`:
```ts
include: {
  createdBy: {
    select: { id: true, name: true, email: true },
  },
},
```

Replace with:
```ts
include: {
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  participants: {
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { joinedAt: "asc" },
  },
  _count: {
    select: { participants: true },
  },
},
```

No other changes to this file.

**Step 2: Verify TypeScript compiles**

```bash
cd /home/pi/trippla
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 3: Commit**

```bash
git add src/lib/db/itinerary.ts
git commit -m "feat: include participants in getTripItinerary query"
```

---

### Task 3: Create the join API endpoint

**Files:**
- Create: `src/app/api/trips/[tripId]/itinerary/[itemId]/join/route.ts`

**Step 1: Create the directory and file**

```bash
mkdir -p /home/pi/trippla/src/app/api/trips/\[tripId\]/itinerary/\[itemId\]/join
```

**Step 2: Write the route handler**

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMemberRole } from "@/lib/db/trips";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ tripId: string; itemId: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { tripId, itemId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getMemberRole(tripId, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Not a trip member" }, { status: 403 });
    }

    const item = await prisma.itineraryItem.findUnique({
      where: { id: itemId },
      select: { tripId: true },
    });
    if (!item || item.tripId !== tripId) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.itineraryParticipant.upsert({
      where: { itineraryItemId_userId: { itineraryItemId: itemId, userId: session.user.id } },
      create: { itineraryItemId: itemId, userId: session.user.id },
      update: {},
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Join itinerary item error:", error);
    return NextResponse.json({ error: "Failed to join activity" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: Params) {
  try {
    const { tripId, itemId } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = await getMemberRole(tripId, session.user.id);
    if (!role) {
      return NextResponse.json({ error: "Not a trip member" }, { status: 403 });
    }

    await prisma.itineraryParticipant.deleteMany({
      where: { itineraryItemId: itemId, userId: session.user.id },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Leave itinerary item error:", error);
    return NextResponse.json({ error: "Failed to leave activity" }, { status: 500 });
  }
}
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/app/api/trips/\[tripId\]/itinerary/\[itemId\]/join/route.ts
git commit -m "feat: add join/leave endpoint for itinerary items"
```

---

### Task 4: Add i18n strings

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/de.json`

**Step 1: Add English strings**

In `messages/en.json`, inside the `"itinerary"` object, add after `"deleteConfirm"`:

```json
"join": "Join",
"leave": "Leave",
"going": "{count} going",
"whoIsGoing": "Who's going",
"beFirstToJoin": "Be the first to join this activity"
```

**Step 2: Add German strings**

In `messages/de.json`, inside the `"itinerary"` object (after `"deleteConfirm"`):

```json
"join": "Mitmachen",
"leave": "Verlassen",
"going": "{count} dabei",
"whoIsGoing": "Wer ist dabei",
"beFirstToJoin": "Sei der Erste, der diese Aktivität mitmacht"
```

**Step 3: Commit**

```bash
git add messages/en.json messages/de.json
git commit -m "feat: add i18n strings for itinerary join feature"
```

---

### Task 5: Update the itinerary page frontend

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/itinerary/page.tsx`

**Step 1: Update the `ItineraryItem` TypeScript interface**

Find the existing `ItineraryItem` interface (line ~26) and add two new optional fields:

```ts
interface ItineraryItem {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: string;
  endTime: string | null;
  category: string | null;
  isAllDay: boolean;
  cost: number | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  participants: { user: { id: string; name: string | null; email: string } }[];
  _count: { participants: number };
}
```

**Step 2: Add `handleJoinToggle` function**

Add this function after `handleDeleteItem` (around line ~256):

```ts
async function handleJoinToggle(item: ItineraryItem) {
  const isJoined = item.participants.some((p) => p.user.id === session?.user?.id);
  const method = isJoined ? "DELETE" : "POST";

  // Optimistic update
  setItems((prev) =>
    prev.map((i) => {
      if (i.id !== item.id) return i;
      if (isJoined) {
        return {
          ...i,
          participants: i.participants.filter((p) => p.user.id !== session?.user?.id),
          _count: { participants: i._count.participants - 1 },
        };
      } else {
        return {
          ...i,
          participants: [
            ...i.participants,
            { user: { id: session!.user!.id, name: session!.user!.name ?? null, email: session!.user!.email! } },
          ],
          _count: { participants: i._count.participants + 1 },
        };
      }
    })
  );

  try {
    const res = await fetch(`/api/trips/${tripId}/itinerary/${item.id}/join`, { method });
    if (!res.ok) throw new Error("Failed");
  } catch {
    // Revert on failure
    fetchItems();
    toast.error(isJoined ? t("itinerary.leave") : t("itinerary.join"));
  }
}
```

**Step 3: Add join button to the card metadata row**

Find the metadata row in the card (around line ~479, the `<div className="flex items-center gap-3 text-sm text-gray-500">`). Add the join button as the **first** element inside that div, before the cost span:

```tsx
<button
  onClick={(e) => { e.stopPropagation(); handleJoinToggle(item); }}
  className={`flex items-center gap-1.5 px-3 py-1 border text-xs font-bold uppercase tracking-wider transition-colors ${
    item.participants.some((p) => p.user.id === session?.user?.id)
      ? "border-teal-500 bg-teal-500/10 text-teal-400"
      : "border-white/20 hover:bg-white/5 text-gray-400"
  }`}
>
  {item.participants.some((p) => p.user.id === session?.user?.id)
    ? t("itinerary.leave")
    : t("itinerary.join")}
  <span className="text-gray-500">· {t("itinerary.going", { count: item._count.participants })}</span>
</button>
```

**Step 4: Add "Who's going" section to the detail modal**

In the detail modal (the `selectedItem` modal around line ~813), find the `<div className="space-y-4 mb-6">` block. Add a "Who's going" section after the "Added by" section:

```tsx
<div>
  <p className="text-sm text-gray-500 mb-2">{t("itinerary.whoIsGoing")}</p>
  {selectedItem._count.participants === 0 ? (
    <p className="text-gray-500 text-sm">{t("itinerary.beFirstToJoin")}</p>
  ) : (
    <div className="flex flex-wrap gap-2">
      {selectedItem.participants.map((p) => (
        <span
          key={p.user.id}
          className="px-3 py-1 bg-teal-500/10 border border-teal-500/30 text-teal-400 text-sm"
        >
          {p.user.name || p.user.email}
        </span>
      ))}
    </div>
  )}
</div>
```

Also add a join/leave button inside the detail modal action area. Find the `{canModify(...) && <div className="flex gap-3">` block at the bottom of the detail modal and add a join button **before** the edit button:

```tsx
<Button
  variant={selectedItem.participants.some((p) => p.user.id === session?.user?.id) ? "outline" : "gradient"}
  className="flex-1"
  onClick={() => handleJoinToggle(selectedItem)}
>
  {selectedItem.participants.some((p) => p.user.id === session?.user?.id)
    ? t("itinerary.leave")
    : t("itinerary.join")}
</Button>
```

Note: the join button in the modal should show for **all members**, not just those who can modify. So place it outside the `canModify` gate — put it in a separate `<div className="flex gap-3 mb-3">` before the existing edit/delete actions block.

**Step 5: Handle default values for items without participants (backward compat)**

The GET response now always includes `participants` and `_count`, but add safe defaults in `fetchItems` just in case:

```ts
setItems(data.items.map((item: ItineraryItem) => ({
  ...item,
  participants: item.participants ?? [],
  _count: item._count ?? { participants: 0 },
})));
```

**Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

**Step 7: Commit**

```bash
git add src/app/[locale]/trips/\[tripId\]/itinerary/page.tsx
git commit -m "feat: add join/leave UI to itinerary cards and detail modal"
```

---

### Task 6: Build and smoke test

**Step 1: Build the app**

```bash
npm run build 2>&1 | tail -20
```

Expected: build succeeds with no errors.

**Step 2: Manual smoke test checklist**

Start the app (`npm run start` or check the running Docker container) and verify:

- [ ] Itinerary page loads without errors
- [ ] Each card shows a Join button with "0 going"
- [ ] Clicking Join toggles it to Leave and increments the count
- [ ] Refreshing the page preserves the joined state
- [ ] Opening the detail modal shows "Who's going" section
- [ ] Joined members appear as teal badges in the detail modal
- [ ] A second user (different session) can also join and both names appear
- [ ] Leaving removes the user from the list
- [ ] Existing itinerary items (create/edit/delete) still work normally
- [ ] Expenses linked to itinerary items still work normally

**Step 3: Commit if any fixes were needed**

```bash
git add -p
git commit -m "fix: itinerary join smoke test fixes"
```
