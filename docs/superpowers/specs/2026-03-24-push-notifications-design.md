# Push Notifications Design

**Date:** 2026-03-24
**Status:** Approved

## Overview

Add browser push notifications to Trippla so trip members are alerted when other members add or change things in a shared trip. Notifications work in desktop browsers, Android Chrome, and when the app is installed as a PWA (the manifest is already in place).

## Dependencies

Add to `package.json`:
- `web-push` — sends Web Push messages from the server
- `@types/web-push` — TypeScript types

## Data Model

Three new Prisma models, following existing schema conventions (relation fields, back-relations, indexes):

### `PushSubscription`
Stores a user's Web Push subscription for a specific device. One user can have multiple entries.

```prisma
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
```

Back-relation on `User`: `pushSubscriptions PushSubscription[]`

### `NotificationPreference`
**Presence-means-disabled:** a row exists only when the user has turned off notifications for that entity type. Absence of a row means enabled. This avoids the need for an `enabled` column and keeps the query logic simple.

```prisma
model NotificationPreference {
  id         String @id @default(cuid())
  userId     String
  entityType String

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, entityType])
  @@index([userId])
}
```

Back-relation on `User`: `notificationPreferences NotificationPreference[]`

Entity types reconciled from all `createActivity` call sites across API routes: `itinerary`, `expense`, `packing`, `poll`, `transport`, `stage`. New entity types added to the activity feed are automatically enabled for all users (no row = enabled).

### `TripNotificationMute`
Per-user, per-trip mute override. Presence of a row means the user has muted that trip.

```prisma
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

Back-relations: `tripMutes TripNotificationMute[]` on `User`; `notificationMutes TripNotificationMute[]` on `Trip`.

## Environment Variables

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=    # exposed to browser bundle (NEXT_PUBLIC_ prefix required)
VAPID_PRIVATE_KEY=               # server-only
VAPID_CONTACT_EMAIL=             # mailto: address passed to setVapidDetails()
```

Generated once with `npx web-push generate-vapid-keys` and stored in `.env`.

## Architecture & Flow

### Server-side dispatch (`src/lib/notifications.ts`)

Exports one function:

```ts
sendTripNotifications(
  tripId: string,
  actorUserId: string,
  entityType: string,
  entityName?: string,
  action?: string
): void  // fire-and-forget, never throws
```

The function wraps an internal async implementation. To keep background work alive in serverless environments, it uses `waitUntil` from `@vercel/functions` when available, detected at runtime via a try/catch dynamic import:

```ts
try {
  const { waitUntil } = await import('@vercel/functions');
  waitUntil(sendAsync(...));
} catch {
  // not on Vercel or package not installed — plain fire-and-forget
  sendAsync(...).catch(console.error);
}
```

The internal async function (`sendAsync`) does:
1. Fetches the actor's `name` from the `User` table and the `name` from the `Trip` table (for notification content)
2. Fetches all `TripMember` rows for the trip
3. Removes the actor from the recipient list
4. Queries `TripNotificationMute` for `{ userId IN [remaining], tripId }` — removes any matching users
5. Queries `NotificationPreference` for `{ userId IN [remaining], entityType }` — removes any matching users (presence = disabled)
6. Loads all `PushSubscription` rows for the remaining users
7. Calls `webpush.setVapidDetails('mailto:' + VAPID_CONTACT_EMAIL, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)` then sends a push to each subscription with payload `{ title: "[Actor] — [Trip]", body: "[action] [entityType]: [entityName]", url: "/trips/[tripId]" }`
8. On HTTP 410 (expired subscription), deletes that `PushSubscription` row
9. All other errors are caught and logged — nothing propagates

If `VAPID_PRIVATE_KEY` or `NEXT_PUBLIC_VAPID_PUBLIC_KEY` are not set, logs a warning and returns early.

Each existing API route that already calls `createActivity(...)` adds one line after it:

```ts
sendTripNotifications(tripId, session.user.id, entityType, entityName, action);
```

### Client-side

**Service worker** (`public/sw.js`):
- Listens for `push` events: parses the payload JSON and calls `self.registration.showNotification(title, { body, data: { url } })`
- Listens for `notificationclick` events: reads `event.notification.data.url`, opens or focuses the tab at that URL, then closes the notification

**Subscription registration** (`src/lib/push-client.ts`):
- Called on every page load after the session is established (e.g. in root layout)
- Checks `Notification.permission`: if `"denied"`, silently returns; if `"default"`, requests permission — if the user denies, silently returns
- Gets `navigator.serviceWorker.ready` then calls `pushManager.getSubscription()`
- If a subscription already exists: POSTs it to `POST /api/push/subscribe` (idempotent upsert) and returns — does not re-subscribe
- If no subscription: calls `pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY })`, then POSTs the result to `POST /api/push/subscribe`

**Note on key rotation:** If the push service rotates the subscription endpoint (rare), the old endpoint stays in the DB until it returns 410 and is auto-deleted. Accepted as a known limitation.

**API routes:**
- `POST /api/push/subscribe` — upserts a `PushSubscription` by `endpoint`. Body: `{ endpoint, keys: { p256dh, auth } }` (standard `PushSubscription` JSON)
- `DELETE /api/push/subscribe` — removes a subscription. Body: `{ endpoint: string }`. Called when the user disables notifications from Settings.

## Settings UI

### User Settings page (`/settings`)

New "Notifications" section in the existing settings page. Contains:
- A toggle row for each entity type: Itinerary, Expenses, Packing, Transport, Stages, Polls
- Toggle **on** (enabling): calls `DELETE /api/user/notification-preferences` with `{ entityType }` — removes the disabled row
- Toggle **off** (disabling): calls `POST /api/user/notification-preferences` with `{ entityType }` — creates the disabled row

On load, fetch `GET /api/user/notification-preferences`. Response shape:

```json
{ "disabledTypes": ["expense", "packing"] }
```

An array of entity types the user has disabled. Any type not in the array is shown as enabled. This keeps the response minimal and consistent with the presence-means-disabled model.

### Per-trip mute

On the trip detail page (`/trips/[tripId]`), a "Mute notifications" toggle is added to the members/settings panel.
- Toggle calls `POST /api/trips/[tripId]/mute` (mute) or `DELETE /api/trips/[tripId]/mute` (unmute)
- The existing `GET /api/trips/[tripId]` response is extended with `isMuted: boolean`, computed by checking whether a `TripNotificationMute` row exists for `{ userId: session.user.id, tripId }`. This lookup is added to the existing trip fetch handler.

## Error Handling

- Push dispatch errors are caught and logged; the originating API response is never affected
- Stale subscriptions (410 from push service) are deleted from the DB automatically
- Users with no push subscriptions are silently skipped
- Denied notification permission: no subscription is stored, no error shown to user
- Missing VAPID keys: `sendTripNotifications` logs a warning and returns early

## Notification Content

```
Title: "[Actor name] — [Trip name]"
Body:  "[action] [entity type]: [entity name]"
       e.g. "Added expense: Dinner at La Maison"
```

Clicking the notification opens `/trips/[tripId]`.

## Out of Scope

- Per-entity-type deep links (e.g. clicking an expense notification opens the expenses tab) — can be added later
- Email fallback for users who deny push permission
- Notification history / read/unread state in-app
- iOS-specific Web Push quirks (iOS 17.4+ supports standard Web Push, no special handling needed)
