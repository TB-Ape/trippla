# Itinerary Join Feature Design

**Date:** 2026-04-28  
**Status:** Approved

## Summary

Allow trip members to join/leave individual itinerary activities so the group can see who plans to attend each one.

## Requirements

- Trip members only can join/leave activities
- Join/leave is a simple toggle (no RSVP states)
- Card in list view: join button + participant count ("3 going")
- Detail modal: full list of participant names
- Must not break any existing functionality

## Data Layer

Add a new `ItineraryParticipant` join table — purely additive, no existing models changed:

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

Back-relations added to `ItineraryItem` (`participants ItineraryParticipant[]`) and `User` (`itineraryParticipations ItineraryParticipant[]`). Cascade deletes prevent orphaned rows.

## API Layer

### New endpoint: `/api/trips/[tripId]/itinerary/[itemId]/join`

- `POST` — validate user is a trip member, upsert participant row
- `DELETE` — delete participant row if it exists

### Updated endpoint: `GET /api/trips/[tripId]/itinerary`

Add to each item's include:
- `_count: { participants: true }` — for the card count
- `participants: { include: { user: { select: { id, name, email } } } }` — for the detail modal

No existing fields change shape.

## Frontend

### Itinerary card (list view)

- Add join/leave toggle button + count to the metadata row
- Optimistic UI update for instant feel

### Detail modal

- Add "Who's going" section with participant names
- If empty: show "Be the first to join" hint

### TypeScript

- Add `participantCount` and `participants` optional fields to `ItineraryItem` interface
- All existing rendering logic untouched

## Backward Compatibility

- New Prisma model is additive only
- Existing GET response gains two new optional fields — non-breaking
- New join endpoint is a new route — no conflicts
- No existing DB columns modified or removed
