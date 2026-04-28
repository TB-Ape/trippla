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

  // Step 7: Build notification payload (structured so sw.js can localise)
  const payload = JSON.stringify({
    actorName: actor.name ?? null,
    tripName: trip.name,
    entityType,
    entityName: entityName ?? null,
    action: action ?? null,
    url: `/trips/${tripId}/${
      { itinerary: "itinerary", expense: "expenses", packing: "packing", transport: "transport", stage: "stages", poll: "polls" }[entityType] ?? ""
    }`,
  });

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
        if (status === 410 || status === 404) {
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

  task.catch((err) => console.error("[notifications] sendAsync failed:", err));
}
