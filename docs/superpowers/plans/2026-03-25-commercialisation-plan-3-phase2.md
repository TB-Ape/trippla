# Commercialisation — Plan 3: Phase 2 Operations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase 2 readiness for broader public launch: GDPR data export, self-hosted Glitchtip error monitoring, automated database backups, and first-time user onboarding modal.

**Architecture:** Data export is a synchronous API route that streams a JSON file. Glitchtip runs as a separate Docker Compose stack to keep the main stack clean. DB backups run in a dedicated container via cron. Onboarding is a client-side modal driven by a `hasOnboarded` flag on the User model.

**Tech Stack:** Next.js App Router, Prisma, Docker Compose, PostgreSQL, `@sentry/nextjs` (Glitchtip-compatible), TypeScript

**Reference spec:** `docs/superpowers/specs/2026-03-25-commercialisation-design.md`

**Prerequisite:** Plans 1 and 2 must be complete before this plan is executed.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `prisma/schema.prisma` | Add hasOnboarded to User |
| Create | `src/app/api/user/export/route.ts` | GDPR data export endpoint |
| Modify | `src/app/api/user/profile/route.ts` | Add GET handler + hasOnboarded to PUT |
| Modify | `src/app/[locale]/settings/page.tsx` | Add data export button |
| Create | `docker-compose.glitchtip.yml` | Glitchtip error monitoring stack |
| Modify | `docker-compose.yml` | Add Glitchtip DSN env var to app service |
| Create | `sentry.client.config.ts` | Sentry/Glitchtip client config |
| Create | `sentry.server.config.ts` | Sentry/Glitchtip server config |
| Create | `scripts/backup.sh` | Database backup script |
| Create | `docker/backup/Dockerfile` | Backup container image |
| Modify | `docker-compose.yml` | Add backup service |
| Create | `src/components/OnboardingModal.tsx` | First-time user welcome modal |
| Modify | `src/app/[locale]/trips/page.tsx` | Show onboarding modal |
| Modify | `messages/en.json` | New translation keys |
| Modify | `messages/de.json` | New translation keys |

---

## Task 1: Schema migration — add hasOnboarded to User

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add field to User model**

In `prisma/schema.prisma`, add after `termsVersion`:

```prisma
hasOnboarded Boolean @default(false)
```

- [ ] **Step 2: Run migration**

```bash
npx prisma migrate dev --name add_has_onboarded_to_user
```

Expected: migration applied, no errors. Existing users get `hasOnboarded = false`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add hasOnboarded field to User for onboarding flow"
```

---

## Task 2: GDPR data export API

**Files:**
- Create: `src/app/api/user/export/route.ts`

- [ ] **Step 1: Create the export route**

Create `src/app/api/user/export/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [
    user,
    trips,
    itineraryItems,
    expenses,
    expenseSplits,
    packingItems,
    pollVotes,
    comments,
    notificationPreferences,
    pushSubscriptions,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        termsAcceptedAt: true,
        termsVersion: true,
      },
    }),
    prisma.trip.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      select: {
        id: true,
        name: true,
        destination: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        isTemplate: true,
        isBucketList: true,
      },
    }),
    // Itinerary items created by this user (required by GDPR Art. 20)
    prisma.itineraryItem.findMany({
      where: { createdById: userId },
      select: {
        id: true,
        tripId: true,
        title: true,
        description: true,
        date: true,
        time: true,
        location: true,
        category: true,
        createdAt: true,
      },
    }),
    prisma.expense.findMany({
      where: { paidById: userId },
      select: {
        id: true,
        tripId: true,
        description: true,
        amount: true,
        currency: true,
        date: true,
        category: true,
      },
    }),
    prisma.expenseSplit.findMany({
      where: { userId },
      select: { expenseId: true, amount: true, isPaid: true },
    }),
    prisma.packingItem.findMany({
      where: { claimedById: userId },
      select: { id: true, packingListId: true, name: true, quantity: true, category: true },
    }),
    prisma.pollVote.findMany({
      where: { userId },
      select: { pollId: true, optionId: true },
    }),
    prisma.comment.findMany({
      where: { userId },
      select: { id: true, content: true, itineraryItemId: true, createdAt: true },
    }),
    prisma.notificationPreference.findMany({
      where: { userId },
      select: { entityType: true },
    }),
    // Push subscription tokens are personal data — must be included (GDPR Art. 20)
    prisma.pushSubscription.findMany({
      where: { userId },
      select: { endpoint: true, p256dh: true, auth: true, createdAt: true },
    }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    trips,
    itineraryItemsCreated: itineraryItems,
    expensesPaid: expenses,
    expenseSplits,
    packingItemsClaimed: packingItems,
    pollVotes,
    comments,
    notificationPreferences,
    pushSubscriptions,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="trippla-data-export-${new Date().toISOString().split("T")[0]}.json"`,
    },
  });
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
curl http://localhost:3000/api/user/export
```

Expected: `{"error":"Unauthorized"}` without a session. With a valid session, expected: JSON download with full data including itinerary items.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/export/route.ts
git commit -m "feat: add GDPR data export API including itinerary items and push tokens"
```

---

## Task 3: Update profile API — add GET handler and hasOnboarded support

**Files:**
- Modify: `src/app/api/user/profile/route.ts`

Currently, this file only has a `PUT` handler. The onboarding modal (Task 6) needs a `GET` handler to read `hasOnboarded`. Also, `hasOnboarded` must be writable via `PUT` — but the existing `updateProfileSchema` (Zod) strips unknown keys, and the `updateData` type is narrowly typed. Both need to be fixed.

- [ ] **Step 1: Add GET handler and fix PUT for hasOnboarded**

In `src/app/api/user/profile/route.ts`, add a `GET` handler before the existing `PUT`, and update `PUT` to support `hasOnboarded`:

```ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, "Password must be at least 6 characters").optional(),
  hasOnboarded: z.boolean().optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) return false;
  return true;
}, { message: "Current password is required to set a new password" });

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, hasOnboarded: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read raw body first so we can extract fields not in the Zod schema
    const body = await req.json();
    const data = updateProfileSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      password?: string;
      hasOnboarded?: boolean;
    } = {};

    if (data.name !== undefined) {
      updateData.name = data.name;
    }

    if (data.hasOnboarded !== undefined) {
      updateData.hasOnboarded = data.hasOnboarded;
    }

    if (data.newPassword && data.currentPassword) {
      if (!user.password) {
        return NextResponse.json({ error: "Cannot change password for OAuth accounts" }, { status: 400 });
      }
      const isValid = await bcrypt.compare(data.currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: { id: true, name: true, email: true, hasOnboarded: true },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify GET works**

```bash
npm run dev
curl http://localhost:3000/api/user/profile
```

Expected: `{"error":"Unauthorized"}` without a session. With session: `{"user":{"id":"...","name":"...","hasOnboarded":false}}`.

- [ ] **Step 3: Verify hasOnboarded update works**

```bash
curl -X PUT http://localhost:3000/api/user/profile \
  -H "Content-Type: application/json" \
  -d '{"hasOnboarded": true}'
```

Expected (with a valid session): `{"user":{"hasOnboarded":true,...}}`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/user/profile/route.ts
git commit -m "feat: add GET handler and hasOnboarded support to profile API"
```

---

## Task 4: Settings — add data export button

**Files:**
- Modify: `src/app/[locale]/settings/page.tsx`

- [ ] **Step 1: Add translation keys**

In `messages/en.json`, add to `"settings"`:
```json
"dataExport": "Your Data",
"dataExportDesc": "Download a copy of all your personal data stored in Trippla (GDPR Art. 20).",
"downloadMyData": "Download My Data",
"downloadingData": "Preparing export..."
```

In `messages/de.json`, add to `"settings"`:
```json
"dataExport": "Ihre Daten",
"dataExportDesc": "Laden Sie eine Kopie aller Ihrer in Trippla gespeicherten personenbezogenen Daten herunter (DSGVO Art. 20).",
"downloadMyData": "Meine Daten herunterladen",
"downloadingData": "Export wird vorbereitet..."
```

- [ ] **Step 2: Add state and handler**

In `src/app/[locale]/settings/page.tsx`, add state:
```tsx
const [isExporting, setIsExporting] = useState(false);
```

Add handler:
```tsx
async function handleDataExport() {
  setIsExporting(true);
  try {
    const res = await fetch("/api/user/export");
    if (!res.ok) throw new Error("Export failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trippla-data-export-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Export failed");
  } finally {
    setIsExporting(false);
  }
}
```

- [ ] **Step 3: Add data export card — before the Delete Account card**

```tsx
{/* Data Export */}
<Card className="p-6 mt-6">
  <h2 className="text-2xl font-black tracking-tight mb-4">{t("settings.dataExport")}</h2>
  <p className="text-sm text-gray-400 mb-4">{t("settings.dataExportDesc")}</p>
  <Button
    type="button"
    onClick={handleDataExport}
    disabled={isExporting}
    variant="outline"
  >
    {isExporting ? t("settings.downloadingData") : t("settings.downloadMyData")}
  </Button>
</Card>
```

- [ ] **Step 4: Manual verify**

1. Navigate to Settings
2. Click "Download My Data"
3. Confirm a `.json` file downloads with your profile, trips, itinerary items, expenses, etc.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/settings/page.tsx messages/en.json messages/de.json
git commit -m "feat: add GDPR data export button to settings"
```

---

## Task 5: Glitchtip error monitoring

**Files:**
- Create: `docker-compose.glitchtip.yml`
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Modify: `docker-compose.yml`

Glitchtip is a self-hosted, open-source Sentry-compatible error monitoring tool. Data never leaves the RPi — no GDPR DPA required, no external dependency.

### 5a: Glitchtip Docker stack

- [ ] **Step 1: Add env vars to .env.production**

Add to `.env.production`:
```
GLITCHTIP_DB_PASSWORD=<generate a strong password>
GLITCHTIP_SECRET_KEY=<run: openssl rand -base64 50>
GLITCHTIP_DSN=<filled in after first-time setup — see Step 3>
```

- [ ] **Step 2: Create Glitchtip compose file**

Create `docker-compose.glitchtip.yml`:

```yaml
# Glitchtip — self-hosted error monitoring
# Start: docker compose -f docker-compose.glitchtip.yml up -d
# First-time setup: see Step 3 below

x-env: &env
  DATABASE_URL: postgresql://glitchtip:${GLITCHTIP_DB_PASSWORD}@glitchtip-db:5432/glitchtip
  SECRET_KEY: ${GLITCHTIP_SECRET_KEY}
  PORT: 8000
  EMAIL_URL: consolemail://
  GLITCHTIP_DOMAIN: http://localhost:8000
  CELERY_WORKER_CONCURRENCY: 1

services:
  glitchtip-db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: glitchtip
      POSTGRES_PASSWORD: ${GLITCHTIP_DB_PASSWORD}
      POSTGRES_DB: glitchtip
    volumes:
      - ${HDD_PATH}/glitchtip/postgres:/var/lib/postgresql/data

  glitchtip-redis:
    image: redis:7-alpine
    restart: unless-stopped

  glitchtip-web:
    image: glitchtip/glitchtip:latest
    restart: unless-stopped
    depends_on:
      - glitchtip-db
      - glitchtip-redis
    ports:
      - "8000:8000"
    environment:
      <<: *env
      REDIS_URL: redis://glitchtip-redis:6379

  glitchtip-worker:
    image: glitchtip/glitchtip:latest
    restart: unless-stopped
    command: ./bin/run-celery-with-beat.sh
    depends_on:
      - glitchtip-db
      - glitchtip-redis
    environment:
      <<: *env
      REDIS_URL: redis://glitchtip-redis:6379
```

- [ ] **Step 3: First-time Glitchtip setup**

```bash
# Start Glitchtip
docker compose -f docker-compose.glitchtip.yml up -d

# Create admin superuser
docker compose -f docker-compose.glitchtip.yml run --rm glitchtip-web ./manage.py createsuperuser
```

Visit `http://localhost:8000` (or via SSH tunnel from the RPi):
1. Log in with the superuser account
2. Create an Organisation (e.g. "Trippla")
3. Create a Project → type: **Django** or **JavaScript** → name: `trippla-app`
4. Copy the DSN (looks like `http://abc123@localhost:8000/1`)
5. Set `GLITCHTIP_DSN=<the DSN>` in `.env.production`

### 5b: Integrate with Next.js

- [ ] **Step 4: Install Sentry SDK**

```bash
npm install @sentry/nextjs
```

- [ ] **Step 5: Create client config**

Create `sentry.client.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
```

- [ ] **Step 6: Create server config**

Create `sentry.server.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
});
```

- [ ] **Step 7: Add DSN env var to docker-compose.yml**

In `docker-compose.yml`, add to the `app` service `environment` block:
```yaml
NEXT_PUBLIC_GLITCHTIP_DSN: ${GLITCHTIP_DSN}
```

And add to the `build.args` block:
```yaml
NEXT_PUBLIC_GLITCHTIP_DSN: ${GLITCHTIP_DSN}
```

Then in `Dockerfile`, add (alongside the other ARG/ENV pairs):
```dockerfile
ARG NEXT_PUBLIC_GLITCHTIP_DSN
ENV NEXT_PUBLIC_GLITCHTIP_DSN=$NEXT_PUBLIC_GLITCHTIP_DSN
```

Note: `GLITCHTIP_DSN` is the name in `.env.production`. It is passed as `NEXT_PUBLIC_GLITCHTIP_DSN` at build time so the client bundle can access it.

- [ ] **Step 8: Verify**

Deploy and navigate to the app. To confirm Glitchtip is receiving events, temporarily add `throw new Error("test glitchtip")` to a server-side API route, trigger it once, remove the line. Check the Glitchtip dashboard for the error event.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.glitchtip.yml sentry.client.config.ts sentry.server.config.ts docker-compose.yml package.json package-lock.json
git commit -m "feat: add self-hosted Glitchtip error monitoring"
```

---

## Task 6: Database backups

**Files:**
- Create: `scripts/backup.sh`
- Create: `docker/backup/Dockerfile`
- Modify: `docker-compose.yml`
- Create: `docs/backup-restore.md`

Backups run daily at 03:00, keep 7 days, write to a mounted external volume (not the RPi SD card).

- [ ] **Step 1: Create backup script**

```bash
mkdir -p /home/tobias/trippla/scripts
```

Create `scripts/backup.sh`:

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="trippla_backup_${DATE}.sql.gz"
KEEP_DAYS=7

echo "[backup] Starting at $(date)"

pg_dump \
  -h "$POSTGRES_HOST" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[backup] Saved: ${FILENAME} ($(du -sh "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

find "$BACKUP_DIR" -name "trippla_backup_*.sql.gz" -mtime +${KEEP_DAYS} -delete
echo "[backup] Pruned backups older than ${KEEP_DAYS} days"

echo "[backup] Done. Current backups:"
ls -lh "$BACKUP_DIR"/trippla_backup_*.sql.gz 2>/dev/null || echo "(none)"
```

- [ ] **Step 2: Create backup Dockerfile**

```bash
mkdir -p /home/tobias/trippla/docker/backup
```

Create `docker/backup/Dockerfile`:

```dockerfile
FROM postgres:16-alpine

RUN apk add --no-cache dcron

# Path is relative to build context (repo root), not this Dockerfile's location
COPY scripts/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

RUN echo "0 3 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | crontab -

CMD ["crond", "-f", "-l", "2"]
```

- [ ] **Step 3: Add backup service to docker-compose.yml**

Add after the `app` service:

```yaml
  backup:
    build:
      context: .
      dockerfile: docker/backup/Dockerfile
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ${HDD_PATH}/trippla/backups:/backups
    environment:
      POSTGRES_HOST: db
      POSTGRES_USER: trippla
      POSTGRES_DB: trippla
      PGPASSWORD: ${POSTGRES_PASSWORD}
```

- [ ] **Step 4: Test a manual backup**

```bash
docker compose up -d backup
docker compose exec backup /usr/local/bin/backup.sh
```

Expected output:
```
[backup] Starting at ...
[backup] Saved: trippla_backup_2026-03-25_03-00-00.sql.gz (...)
[backup] Pruned backups older than 7 days
[backup] Done. Current backups:
-rw-r--r-- 1 root root ...
```

Verify the file exists on the host:
```bash
ls ${HDD_PATH}/trippla/backups/
```

- [ ] **Step 5: Create restore documentation**

Create `docs/backup-restore.md`:

```markdown
# Backup & Restore

## Backups

Automated daily backups run at 03:00 via the `backup` Docker service.

- Location: `${HDD_PATH}/trippla/backups/`
- Retention: 7 days (older files pruned automatically)
- Format: gzipped pg_dump (`trippla_backup_YYYY-MM-DD_HH-MM-SS.sql.gz`)

## Restore Procedure

1. Stop the app to prevent writes during restore:
   ```bash
   docker compose stop app
   ```

2. Drop and recreate the database:
   ```bash
   docker compose exec db psql -U trippla -c "DROP DATABASE trippla;"
   docker compose exec db psql -U trippla -c "CREATE DATABASE trippla;"
   ```

3. Restore from the chosen backup file:
   ```bash
   gunzip -c /path/to/trippla_backup_YYYY-MM-DD.sql.gz \
     | docker compose exec -T db psql -U trippla -d trippla
   ```

4. Restart the app:
   ```bash
   docker compose start app
   ```

5. Verify the restore:
   ```bash
   curl https://trippla.de/api/health
   ```
```

- [ ] **Step 6: Commit**

```bash
git add scripts/backup.sh docker/backup/Dockerfile docker-compose.yml docs/backup-restore.md
git commit -m "feat: add automated daily PostgreSQL backups with 7-day retention"
```

---

## Task 7: Onboarding modal

**Files:**
- Create: `src/components/OnboardingModal.tsx`
- Modify: `src/app/[locale]/trips/page.tsx`

### 7a: Create the modal component

- [ ] **Step 1: Add translation keys**

In `messages/en.json`, add a new `"onboarding"` section:
```json
"onboarding": {
  "welcomeTitle": "Welcome to TRIPPLA!",
  "welcomeSubtitle": "Here's how it works",
  "itinerary": "Itinerary",
  "itineraryDesc": "Build your trip timeline together. Add activities, restaurants, and experiences.",
  "expenses": "Expenses",
  "expensesDesc": "Track spending and split costs fairly. See who owes what at a glance.",
  "packing": "Packing",
  "packingDesc": "Coordinate what to bring. Claim items so nothing gets forgotten.",
  "polls": "Polls",
  "pollsDesc": "Make group decisions easy. Vote on destinations, activities, and more.",
  "createFirstTrip": "Create Your First Trip",
  "skip": "Skip for now"
}
```

In `messages/de.json`:
```json
"onboarding": {
  "welcomeTitle": "Willkommen bei TRIPPLA!",
  "welcomeSubtitle": "So funktioniert es",
  "itinerary": "Reiseplan",
  "itineraryDesc": "Erstellt gemeinsam euren Reiseplan. Fügt Aktivitäten, Restaurants und Erlebnisse hinzu.",
  "expenses": "Ausgaben",
  "expensesDesc": "Verfolgt Ausgaben und teilt Kosten fair auf. Seht auf einen Blick, wer was schuldet.",
  "packing": "Packliste",
  "packingDesc": "Koordiniert, was ihr einpackt. Übernehmt Gegenstände, damit nichts vergessen wird.",
  "polls": "Abstimmungen",
  "pollsDesc": "Gruppenentscheidungen leicht gemacht. Stimmt über Reiseziele, Aktivitäten und mehr ab.",
  "createFirstTrip": "Erste Reise erstellen",
  "skip": "Überspringen"
}
```

- [ ] **Step 2: Create OnboardingModal component**

Create `src/components/OnboardingModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Map, DollarSign, Package, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onDismiss: () => void;
}

const features = [
  { key: "itinerary", Icon: Map },
  { key: "expenses", Icon: DollarSign },
  { key: "packing", Icon: Package },
  { key: "polls", Icon: Vote },
] as const;

export function OnboardingModal({ onDismiss }: Props) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const locale = useLocale();
  const [isDismissing, setIsDismissing] = useState(false);

  async function markOnboarded() {
    if (isDismissing) return;
    setIsDismissing(true);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasOnboarded: true }),
    });
    onDismiss();
  }

  async function handleCreateTrip() {
    await markOnboarded();
    router.push(`/${locale}/trips/new`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#111] border-2 border-white/10 max-w-lg w-full p-8">
        <h1 className="text-3xl font-black tracking-tighter mb-1">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("welcomeTitle")}
          </span>
        </h1>
        <p className="text-gray-400 mb-8 text-sm uppercase tracking-widest font-bold">
          {t("welcomeSubtitle")}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {features.map(({ key, Icon }) => (
            <div key={key} className="border border-white/10 p-4">
              <Icon className="w-5 h-5 text-teal-400 mb-2" />
              <h3 className="font-bold text-sm uppercase tracking-wider mb-1">
                {t(key as any)}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t(`${key}Desc` as any)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="gradient"
            onClick={handleCreateTrip}
            disabled={isDismissing}
            className="flex-1"
          >
            {t("createFirstTrip")}
          </Button>
          <Button variant="outline" onClick={markOnboarded} disabled={isDismissing}>
            {t("skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 7b: Wire modal to trips page

- [ ] **Step 3: Add onboarding state and modal to trips page**

In `src/app/[locale]/trips/page.tsx`, add:

1. Import the modal component:
```tsx
import { OnboardingModal } from "@/components/OnboardingModal";
```

2. Add state alongside existing state (after the existing `useState` declarations):
```tsx
const [showOnboarding, setShowOnboarding] = useState(false);
```

3. Add a `useEffect` that fetches `hasOnboarded` once the session is loaded. Add this after the existing `useEffect` hooks that fetch trip data:
```tsx
useEffect(() => {
  if (status !== "authenticated" || !session?.user?.id) return;
  fetch("/api/user/profile")
    .then((r) => r.json())
    .then((data) => {
      if (data.user?.hasOnboarded === false) setShowOnboarding(true);
    })
    .catch(() => {}); // Non-critical — silently ignore fetch errors
  // Use session.user.id (stable string) not session.user (new object ref each render)
}, [status, session?.user?.id]);
```

4. Render the modal at the top of the returned JSX, before the main content:
```tsx
{showOnboarding && (
  <OnboardingModal onDismiss={() => setShowOnboarding(false)} />
)}
```

- [ ] **Step 4: Manual verify**

1. In Prisma Studio, set `hasOnboarded = false` for your user
2. Log in and navigate to the trips page
3. Confirm the onboarding modal appears
4. Click "Skip" — confirm modal closes and `hasOnboarded` is now `true` in the DB
5. Refresh page — confirm modal does not appear again

- [ ] **Step 5: Commit**

```bash
git add src/components/OnboardingModal.tsx src/app/[locale]/trips/page.tsx messages/en.json messages/de.json
git commit -m "feat: add first-time user onboarding modal"
```

---

## Done

All Phase 2 items are complete:
- GDPR data export in Settings (JSON download, includes itinerary items + push tokens)
- Profile API has GET handler and supports `hasOnboarded` updates
- Self-hosted Glitchtip captures errors from client and server (data stays on RPi)
- Automated daily PostgreSQL backups with 7-day retention to external storage
- First-time users see an onboarding modal on the trips page

**The app is now ready for broader public launch.**
