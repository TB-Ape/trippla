# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add browser push notifications so trip members are alerted when another member creates or modifies something in a shared trip, with per-type and per-trip controls.

**Architecture:** Fire-and-forget server-side dispatch via `web-push`, triggered alongside existing `createActivity` calls in each trip API route. Client-side subscription registration runs once per browser after login. Settings UI lives in `/settings` (global toggles) and the trip detail page (per-trip mute).

**Tech Stack:** Next.js App Router, Prisma + PostgreSQL, `web-push`, `@vercel/functions` (optional), TypeScript

**Spec:** `docs/superpowers/specs/2026-03-24-push-notifications-design.md`

---

## File Map

**New files:**
- `public/sw.js` — service worker: handles `push` and `notificationclick` events
- `src/lib/notifications.ts` — server-side push dispatch (the only file that imports `web-push`)
- `src/lib/push-client.ts` — client-side subscription logic (runs in browser)
- `src/components/PushSetup.tsx` — thin client component that calls push-client after session check
- `src/app/api/push/subscribe/route.ts` — POST (upsert subscription), DELETE (remove subscription)
- `src/app/api/user/notification-preferences/route.ts` — GET (disabled types), POST (disable type), DELETE (enable type)
- `src/app/api/trips/[tripId]/mute/route.ts` — POST (mute), DELETE (unmute)

**Modified files:**
- `prisma/schema.prisma` — add `PushSubscription`, `NotificationPreference`, `TripNotificationMute` models + back-relations on `User` and `Trip`
- `src/app/layout.tsx` — add `<PushSetup />` inside `SessionProvider`
- `src/app/[locale]/settings/page.tsx` — add Notifications section
- `src/app/[locale]/trips/[tripId]/page.tsx` — add mute toggle to members panel
- `src/app/api/trips/[tripId]/route.ts` — extend GET to include `isMuted`
- `src/app/api/trips/[tripId]/itinerary/route.ts` — add `sendTripNotifications` after `createActivity`
- `src/app/api/trips/[tripId]/expenses/route.ts` — same
- `src/app/api/trips/[tripId]/packing/route.ts` — same
- `src/app/api/trips/[tripId]/packing/items/route.ts` — same
- `src/app/api/trips/[tripId]/polls/route.ts` — same
- `src/app/api/trips/[tripId]/transport/route.ts` — same
- `src/app/api/trips/[tripId]/stages/route.ts` — same

---

## Task 1: Install dependency and configure VAPID keys

**Files:**
- Modify: `package.json`
- Modify: `.env` (add keys)
- Create: `.env.example` additions

- [ ] **Step 1: Install web-push**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

- [ ] **Step 2: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Copy the output. You'll get a public key and a private key.

- [ ] **Step 3: Add env vars to `.env`**

Add these three lines (replace the placeholders with the generated values):

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<paste public key here>
VAPID_PRIVATE_KEY=<paste private key here>
VAPID_CONTACT_EMAIL=<your email address>
```

Note: `NEXT_PUBLIC_` prefix is required so Next.js includes the public key in the browser bundle.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add web-push dependency"
```

---

## Task 2: Database schema — add notification models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add the three new models to `prisma/schema.prisma`**

Add after the `Activity` model (end of file):

```prisma
// Push Notifications
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model NotificationPreference {
  id         String @id @default(cuid())
  userId     String
  entityType String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, entityType])
  @@index([userId])
}

model TripNotificationMute {
  id      String   @id @default(cuid())
  userId  String
  tripId  String
  mutedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@unique([userId, tripId])
  @@index([userId])
  @@index([tripId])
}
```

- [ ] **Step 2: Add back-relations to `User` model**

Inside the `User` model, after the `activities Activities[]` line, add:

```prisma
pushSubscriptions      PushSubscription[]
notificationPreferences NotificationPreference[]
tripMutes              TripNotificationMute[]
```

- [ ] **Step 3: Add back-relations to `Trip` model**

Inside the `Trip` model, after the `activities Activity[]` line, add:

```prisma
notificationMutes TripNotificationMute[]
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name add-push-notifications
```

Expected output: migration created and applied, Prisma client regenerated.

- [ ] **Step 5: Verify schema compiles**

```bash
npx prisma validate
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add push notification models to schema"
```

---

## Task 3: Server-side notification dispatch

**Files:**
- Create: `src/lib/notifications.ts`

This is the single file that handles all push dispatch logic. No other file imports `web-push`.

- [ ] **Step 1: Create `src/lib/notifications.ts`**

```typescript
import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL;

async function sendAsync(
  tripId: string,
  actorUserId: string,
  entityType: string,
  entityName?: string,
  action?: string
): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_CONTACT_EMAIL) {
    console.warn("[notifications] VAPID keys not configured — skipping push");
    return;
  }

  webpush.setVapidDetails(
    `mailto:${VAPID_CONTACT_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  // Step 1: Fetch actor name and trip name for notification content
  const [actor, trip] = await Promise.all([
    prisma.user.findUnique({ where: { id: actorUserId }, select: { name: true } }),
    prisma.trip.findUnique({ where: { id: tripId }, select: { name: true } }),
  ]);

  if (!actor || !trip) return;

  // Step 2: Fetch all trip members
  const members = await prisma.tripMember.findMany({
    where: { tripId },
    select: { userId: true },
  });

  // Step 3: Remove the actor
  let recipientIds = members
    .map((m) => m.userId)
    .filter((id) => id !== actorUserId);

  if (recipientIds.length === 0) return;

  // Step 4: Remove muted users
  const mutes = await prisma.tripNotificationMute.findMany({
    where: { tripId, userId: { in: recipientIds } },
    select: { userId: true },
  });
  const mutedIds = new Set(mutes.map((m) => m.userId));
  recipientIds = recipientIds.filter((id) => !mutedIds.has(id));

  if (recipientIds.length === 0) return;

  // Step 5: Remove users who disabled this entity type (presence = disabled)
  const disabled = await prisma.notificationPreference.findMany({
    where: { userId: { in: recipientIds }, entityType },
    select: { userId: true },
  });
  const disabledIds = new Set(disabled.map((p) => p.userId));
  recipientIds = recipientIds.filter((id) => !disabledIds.has(id));

  if (recipientIds.length === 0) return;

  // Step 6: Load subscriptions for remaining recipients
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: recipientIds } },
  });

  if (subscriptions.length === 0) return;

  // Step 7: Build notification payload
  const title = `${actor.name ?? "Someone"} — ${trip.name}`;
  const bodyParts = [action, entityType, entityName ? `"${entityName}"` : undefined]
    .filter(Boolean)
    .join(" ");
  const body = bodyParts || `Updated ${entityType}`;
  const payload = JSON.stringify({ title, body, url: `/trips/${tripId}` });

  // Step 8: Send to each subscription
  const staleEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
      } catch (err: unknown) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 410) {
          staleEndpoints.push(sub.endpoint);
        } else {
          console.error("[notifications] push failed:", err);
        }
      }
    })
  );

  // Step 9: Clean up stale subscriptions
  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
  }
}

/**
 * Fire-and-forget push notification dispatch.
 * Never throws. Safe to call without await.
 */
export function sendTripNotifications(
  tripId: string,
  actorUserId: string,
  entityType: string,
  entityName?: string,
  action?: string
): void {
  // Use waitUntil on Vercel to keep the serverless function alive for background work.
  // Fall back to plain fire-and-forget on long-lived Node.js servers.
  const task = sendAsync(tripId, actorUserId, entityType, entityName, action);

  import("@vercel/functions")
    .then(({ waitUntil }) => waitUntil(task))
    .catch(() => task.catch((err) => console.error("[notifications] sendAsync failed:", err)));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `notifications.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: add server-side push notification dispatch"
```

---

## Task 4: Push subscription API routes

**Files:**
- Create: `src/app/api/push/subscribe/route.ts`

- [ ] **Step 1: Create `src/app/api/push/subscribe/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: save or update a push subscription
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint, keys } = body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: session.user.id, p256dh: keys.p256dh, auth: keys.auth },
    create: { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}

// DELETE: remove a push subscription
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { endpoint } = body as { endpoint: string };

  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: session.user.id },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/push/subscribe/route.ts
git commit -m "feat: add push subscription API routes"
```

---

## Task 5: Notification preferences API routes

**Files:**
- Create: `src/app/api/user/notification-preferences/route.ts`

Remember: presence of a row means the type is **disabled**. Absence means enabled.

- [ ] **Step 1: Create `src/app/api/user/notification-preferences/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: return list of entity types the user has disabled
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prefs = await prisma.notificationPreference.findMany({
    where: { userId: session.user.id },
    select: { entityType: true },
  });

  return NextResponse.json({ disabledTypes: prefs.map((p) => p.entityType) });
}

// POST: disable notifications for an entity type (create a row)
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType } = await req.json() as { entityType: string };
  if (!entityType) return NextResponse.json({ error: "Missing entityType" }, { status: 400 });

  await prisma.notificationPreference.upsert({
    where: { userId_entityType: { userId: session.user.id, entityType } },
    update: {},
    create: { userId: session.user.id, entityType },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: enable notifications for an entity type (remove the row)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entityType } = await req.json() as { entityType: string };
  if (!entityType) return NextResponse.json({ error: "Missing entityType" }, { status: 400 });

  await prisma.notificationPreference.deleteMany({
    where: { userId: session.user.id, entityType },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/notification-preferences/route.ts
git commit -m "feat: add notification preferences API routes"
```

---

## Task 6: Trip mute API route + isMuted in trip GET

**Files:**
- Create: `src/app/api/trips/[tripId]/mute/route.ts`
- Modify: `src/app/api/trips/[tripId]/route.ts`

- [ ] **Step 1: Create `src/app/api/trips/[tripId]/mute/route.ts`**

```typescript
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: mute this trip
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;

  // Verify membership
  const member = await prisma.tripMember.findUnique({
    where: { tripId_userId: { tripId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Not a trip member" }, { status: 403 });

  await prisma.tripNotificationMute.upsert({
    where: { userId_tripId: { userId: session.user.id, tripId } },
    update: {},
    create: { userId: session.user.id, tripId },
  });

  return NextResponse.json({ ok: true });
}

// DELETE: unmute this trip
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tripId } = await params;

  await prisma.tripNotificationMute.deleteMany({
    where: { userId: session.user.id, tripId },
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Extend `GET /api/trips/[tripId]` to include `isMuted`**

In `src/app/api/trips/[tripId]/route.ts`, find the `GET` handler. After `const trip = await getTripById(tripId, session.user.id);`, add:

```typescript
const mute = await prisma.tripNotificationMute.findUnique({
  where: { userId_tripId: { userId: session.user.id, tripId } },
});
```

Then change the return line from:
```typescript
return NextResponse.json({ trip }, { status: 200 });
```
to:
```typescript
return NextResponse.json({ trip, isMuted: !!mute }, { status: 200 });
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/trips/[tripId]/mute/route.ts src/app/api/trips/[tripId]/route.ts
git commit -m "feat: add trip mute API and isMuted to trip fetch"
```

---

## Task 7: Wire sendTripNotifications into all trip API routes

**Files:**
- Modify: `src/app/api/trips/[tripId]/itinerary/route.ts`
- Modify: `src/app/api/trips/[tripId]/expenses/route.ts`
- Modify: `src/app/api/trips/[tripId]/packing/route.ts`
- Modify: `src/app/api/trips/[tripId]/packing/items/route.ts`
- Modify: `src/app/api/trips/[tripId]/polls/route.ts`
- Modify: `src/app/api/trips/[tripId]/transport/route.ts`
- Modify: `src/app/api/trips/[tripId]/stages/route.ts`

The pattern is identical in each file. In every POST handler that already calls `createActivity(...)`, add the import and one call right after:

**Import to add at the top of each file:**
```typescript
import { sendTripNotifications } from "@/lib/notifications";
```

**Call to add after each `createActivity(...)` block:**

For **itinerary**:
```typescript
sendTripNotifications(tripId, session.user.id, "itinerary", item.title, "created");
```

For **expenses**:
```typescript
sendTripNotifications(tripId, session.user.id, "expense", expense.description, "created");
```

For **packing** (list creation):
```typescript
sendTripNotifications(tripId, session.user.id, "packing", list.name, "created");
```

For **packing/items**:
```typescript
sendTripNotifications(tripId, session.user.id, "packing", item.name, "created");
```

For **polls**:
```typescript
sendTripNotifications(tripId, session.user.id, "poll", poll.question, "created");
```

For **transport**:
```typescript
sendTripNotifications(tripId, session.user.id, "transport", transport.title, "created");
```

For **stages**:
```typescript
sendTripNotifications(tripId, session.user.id, "stage", stage.title, "created");
```

- [ ] **Step 1: Read each route file, find its POST handler and `createActivity` call, add the import and notification call**

Do this for all 7 files listed above. Only add to `POST` handlers (item creation), not `PUT`/`PATCH`/`DELETE`.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/trips/
git commit -m "feat: wire push notifications into trip API routes"
```

---

## Task 8: Service worker

**Files:**
- Create: `public/sw.js`

The service worker runs in the browser and handles incoming push events. It lives in `public/` so Next.js serves it at the root path `/sw.js` (required for service workers to have full scope).

- [ ] **Step 1: Create `public/sw.js`**

```javascript
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Trippla", body: event.data.text(), url: "/trips" };
  }

  const { title, body, url } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-72x72.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url ?? "/trips";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // If a Trippla tab is already open, focus it and navigate
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            return client.navigate(url);
          }
        }
        // Otherwise open a new tab
        return clients.openWindow(url);
      })
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat: add push notification service worker"
```

---

## Task 9: Client-side push subscription logic

**Files:**
- Create: `src/lib/push-client.ts`

This module handles requesting permission and registering the browser's push subscription with the server.

- [ ] **Step 1: Create `src/lib/push-client.ts`**

```typescript
export async function registerPushSubscription(): Promise<void> {
  // Only runs in browser
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    console.warn("[push-client] NEXT_PUBLIC_VAPID_PUBLIC_KEY not set");
    return;
  }

  // Request permission if not yet decided
  if (Notification.permission === "denied") return;
  if (Notification.permission === "default") {
    const result = await Notification.requestPermission();
    if (result !== "granted") return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription first — avoid re-subscribing on every load
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    // POST to server (idempotent upsert)
    const sub = subscription.toJSON() as {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }),
    });
  } catch (err) {
    console.error("[push-client] subscription failed:", err);
  }
}

// Helper: convert VAPID public key from base64url to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/push-client.ts
git commit -m "feat: add client-side push subscription logic"
```

---

## Task 10: Register service worker and subscribe on login

**Files:**
- Create: `src/components/PushSetup.tsx`
- Modify: `src/app/layout.tsx`

The service worker registration and push subscription must happen client-side after the user is authenticated.

- [ ] **Step 1: Create `src/components/PushSetup.tsx`**

```typescript
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { registerPushSubscription } from "@/lib/push-client";

export function PushSetup() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("[PushSetup] SW registration failed:", err);
      });
    }

    // Register push subscription
    registerPushSubscription();
  }, [session?.user]);

  return null;
}
```

- [ ] **Step 2: Add `<PushSetup />` to `src/app/layout.tsx`**

Add the import at the top:
```typescript
import { PushSetup } from "@/components/PushSetup";
```

Inside `<SessionProvider>`, add `<PushSetup />` before `{children}`:
```tsx
<SessionProvider>
  <PushSetup />
  {children}
</SessionProvider>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PushSetup.tsx src/app/layout.tsx
git commit -m "feat: register service worker and push subscription on login"
```

---

## Task 11: Notification preferences UI in Settings

**Files:**
- Modify: `src/app/[locale]/settings/page.tsx`

Add a "Notifications" section below the existing settings. The section shows one toggle per entity type. On load, fetch disabled types from `GET /api/user/notification-preferences`. Toggling calls POST (disable) or DELETE (enable).

- [ ] **Step 1: Read the current `src/app/[locale]/settings/page.tsx` to understand the existing structure**

The file uses `useState` for all form state and `fetch` for API calls. Follow the same pattern.

- [ ] **Step 2: Add notification state to the component**

Add these state variables near the top of `SettingsPage`:

```typescript
const NOTIFICATION_TYPES = [
  { key: "itinerary", label: "Itinerary" },
  { key: "expense", label: "Expenses" },
  { key: "packing", label: "Packing" },
  { key: "transport", label: "Transport" },
  { key: "stage", label: "Stages" },
  { key: "poll", label: "Polls" },
] as const;

const [disabledNotifTypes, setDisabledNotifTypes] = useState<string[]>([]);
```

- [ ] **Step 3: Fetch notification preferences on mount**

Add a `useEffect` that runs when the session is loaded:

```typescript
useEffect(() => {
  if (!session?.user) return;
  fetch("/api/user/notification-preferences")
    .then((r) => r.json())
    .then((data) => setDisabledNotifTypes(data.disabledTypes ?? []));
}, [session?.user]);
```

- [ ] **Step 4: Add the toggle handler**

```typescript
async function handleNotifToggle(entityType: string) {
  const isCurrentlyDisabled = disabledNotifTypes.includes(entityType);
  // Optimistic update
  if (isCurrentlyDisabled) {
    setDisabledNotifTypes((prev) => prev.filter((t) => t !== entityType));
  } else {
    setDisabledNotifTypes((prev) => [...prev, entityType]);
  }
  // Sync to server: if currently disabled → enable (DELETE row), if enabled → disable (POST row)
  await fetch("/api/user/notification-preferences", {
    method: isCurrentlyDisabled ? "DELETE" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType }),
  });
}
```

- [ ] **Step 5: Add the Notifications section to the JSX**

Find the end of the last `<Card>` in the return statement. Add a new card after it:

```tsx
{/* Notifications */}
<Card className="p-6">
  <h2 className="text-lg font-bold mb-4">Notifications</h2>
  <p className="text-sm text-gray-400 mb-4">
    Choose which activity types trigger push notifications.
  </p>
  <div className="space-y-3">
    {NOTIFICATION_TYPES.map(({ key, label }) => {
      const isEnabled = !disabledNotifTypes.includes(key);
      return (
        <div key={key} className="flex items-center justify-between">
          <span className="text-sm text-gray-300">{label}</span>
          <button
            onClick={() => handleNotifToggle(key)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isEnabled ? "bg-teal-500" : "bg-white/20"
            }`}
            aria-label={`Toggle ${label} notifications`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                isEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      );
    })}
  </div>
</Card>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/settings/page.tsx
git commit -m "feat: add notification preferences section to settings"
```

---

## Task 12: Per-trip mute toggle on trip detail page

**Files:**
- Modify: `src/app/[locale]/trips/[tripId]/page.tsx`

Add a mute toggle to the members panel on the trip detail page. The existing trip fetch returns `isMuted` (added in Task 6).

- [ ] **Step 1: Read `src/app/[locale]/trips/[tripId]/page.tsx` to find where the trip data is fetched and where the members panel is rendered**

Look for the `useEffect` that fetches `/api/trips/[tripId]` and the section that renders member avatars or trip settings. That's where the mute toggle goes.

- [ ] **Step 2: Add isMuted state**

```typescript
const [isMuted, setIsMuted] = useState(false);
```

- [ ] **Step 3: Set isMuted from the trip fetch response**

In the `useEffect` that loads trip data, where `setTrip(data.trip)` is called, also add:

```typescript
setIsMuted(data.isMuted ?? false);
```

- [ ] **Step 4: Add the mute toggle handler**

```typescript
async function handleMuteToggle() {
  const newMuted = !isMuted;
  setIsMuted(newMuted); // optimistic
  await fetch(`/api/trips/${tripId}/mute`, {
    method: newMuted ? "POST" : "DELETE",
  });
}
```

- [ ] **Step 5: Add the mute toggle button to the members panel JSX**

Find the section where trip members are listed. Add the toggle button near the bottom of that section (or next to the member list heading):

```tsx
<div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
  <span className="text-sm text-gray-400">Notifications</span>
  <button
    onClick={handleMuteToggle}
    className={`relative w-10 h-5 rounded-full transition-colors ${
      isMuted ? "bg-white/20" : "bg-teal-500"
    }`}
    aria-label={isMuted ? "Unmute trip notifications" : "Mute trip notifications"}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
        isMuted ? "translate-x-0" : "translate-x-5"
      }`}
    />
  </button>
</div>
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/app/[locale]/trips/[tripId]/page.tsx
git commit -m "feat: add per-trip notification mute toggle"
```

---

## Task 13: Manual end-to-end verification

No automated tests exist in this project. Verify the feature manually.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test subscription registration**
  - Log in with a user account
  - Open browser DevTools → Application → Service Workers — verify `sw.js` is registered
  - Check Application → Notifications — verify permission was requested
  - Check the DB: `SELECT * FROM "PushSubscription"` — verify a row was created for your user

- [ ] **Step 3: Test notification delivery**
  - Open the app in two different browsers (or browser + incognito) as two different users, both members of the same trip
  - In browser A, add a new itinerary item to the trip
  - Verify browser B receives a push notification with the correct title and body

- [ ] **Step 4: Test notification does NOT fire for own actions**
  - In browser A, add another item — verify browser A does NOT receive a notification

- [ ] **Step 5: Test per-trip mute**
  - In browser B, go to the trip detail page and toggle "Mute notifications" ON
  - In browser A, add another item — verify browser B does NOT receive a notification
  - Toggle mute OFF — verify notifications resume

- [ ] **Step 6: Test notification preferences**
  - In browser B, go to Settings → Notifications, toggle "Expenses" OFF
  - In browser A, add an expense — verify browser B does NOT receive a notification
  - Other types (e.g. itinerary) should still notify

- [ ] **Step 7: Commit if any minor fixes were needed**

```bash
git add -A
git commit -m "fix: push notification manual testing fixes"
```
