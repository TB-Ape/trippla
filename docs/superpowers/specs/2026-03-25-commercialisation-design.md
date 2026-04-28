# Spec: Production-Ready Commercial Launch — Trippla

**Date:** 2026-03-25
**Status:** Approved
**Scope:** Legal compliance, security hardening, infrastructure — two phased releases

---

## Context

Trippla is a collaborative group trip planning app (Next.js 14+, TypeScript, PostgreSQL + Prisma, Docker, self-hosted on Raspberry Pi) deployed at trippla.de. The goal is to make the app safe, legally compliant, and stable enough for a public launch — monetisation is not in scope.

The operator is based in Germany, so German law (TMG/TDDDG, TTDSG) and GDPR apply.

**Rollout:** Phase 1 enables a small public launch. Phase 2 prepares for broader public access.

---

## Phase 1: Small Public Launch Readiness

### 1. Legal Pages

**New pages:**
- `/impressum` — Impressum (required by § 5 TMG/TDDDG): full name, physical address, email, and either a phone number or a qualifying electronic contact form. Note: German case law has contested email-only Impressums; including a phone number is the safest approach. **Legal review by a qualified person is required before publishing** — a generator tool (e.g. Datenschutz-Generator.de) is a starting point only, not a substitute.
- `/datenschutz` — Privacy Policy (Datenschutzerklärung): bilingual DE/EN, covering:
  - Data collected: email, name, trip data, push notification tokens, IP addresses (rate limiting)
  - Self-hosted infrastructure (no third-party cloud processing of user data, except where noted)
  - Session/auth cookie usage (strictly necessary, see cookie section below)
  - Email provider as data processor (see Data Processors section)
  - Data deletion rights and how to exercise them
  - Contact details for data requests
- `/agb` — Terms of Service: bilingual DE/EN, covering acceptable use, account termination, liability limitations

**Terms version tracking:**
The schema field for recording acceptance must include both a timestamp and a version identifier:
- `termsAcceptedAt DateTime?` — when the user accepted
- `termsVersion String?` — which version they accepted (e.g. `"2026-03-25"`)

When terms are updated, existing users must be prompted to re-accept on next login if they accepted an older version.

**Wiring:**
- Footer on every page: Impressum · Datenschutz · AGB
- Signup form: required checkbox "I agree to the Terms of Service and Privacy Policy"
- Schema migration required for `termsAcceptedAt` and `termsVersion` on `User`

**Data Processors — GDPR Art. 28:**
The following third-party services process personal data and require:
1. A signed Data Processing Agreement (DPA/AVV) with each provider
2. Disclosure in the Datenschutzerklärung

| Service | What they process | Action required |
|---|---|---|
| Email provider (SMTP relay for verification/password reset emails) | Email address, name, IP | Identify provider, sign DPA, list in Datenschutz |

Note: if Sentry is adopted in Phase 2, it must also be listed (see Phase 2).

---

### 2. Cookie Consent (TTDSG)

**Classification of cookies used by Trippla:**
- Session/authentication cookie (`next-auth.session-token`) — strictly necessary for the service the user has explicitly requested (logging in). Exempt from consent under TTDSG § 25(2)(2).

**Conclusion:** If Trippla uses only session/auth cookies and no analytics, tracking, or advertising cookies, a consent banner is **not legally required** under TTDSG. Blocking access behind a consent gate for strictly necessary cookies would be incorrect and would unnecessarily impede lawful access.

**What to do instead:**
- Document the session cookie in the Datenschutzerklärung (name, purpose, duration, strictly necessary basis)
- Do not implement a consent banner for Phase 1
- If any non-essential cookies are added in future (e.g. analytics), revisit this decision and add a banner scoped to those cookies only

---

### 3. GDPR — Account Deletion (Right to Erasure)

**API:** `DELETE /api/user/delete`
- Requires the user to confirm by submitting their email address in the request body
- Verifies the email matches the authenticated session
- Invalidates the session immediately after deletion
- Redirects to home with a confirmation message

**Handling of other members' data in owner-deleted trips:**

GDPR Art. 17 covers the deleting user's own data. However, cascade-deleting contributions made by *other members* (their expenses, packing items, votes, comments) in trips they did not own requires careful handling.

Chosen approach: **transfer or anonymise**, not silent cascade-delete.

Before deletion, if the user owns trips with other members:
1. If any co-members exist on an owned trip: the user is prompted to either (a) transfer ownership to another member, or (b) confirm they understand those members' contributions will be deleted
2. Contributions made *by other users* on the owner's trips (expenses, packing items, votes, comments) are **anonymised** (author field set to null / "Deleted User") rather than deleted — this preserves trip integrity for remaining members while removing the personal data linkage
3. The deleted user's own contributions across all trips (including trips they were a member of but did not own) are deleted

**UI:** New "Delete Account" section in Settings. Two-step flow:
1. Show warning listing any owned trips with active members
2. Offer ownership transfer option per trip
3. Require email re-entry to confirm final deletion

---

### 4. Rate Limiting

**Package:** `rate-limiter-flexible`

**Store:** In-memory store for Phase 1. **Known limitation:** rate limit counters reset on every process restart (deployment, crash). This means a burst attack timed around a restart bypasses limits temporarily. For the expected scale of a small public launch this is acceptable, but it must be documented. If brute-force on auth endpoints becomes a concern, add a lightweight Redis container (minimal RPi overhead) and switch to the Redis adapter.

**Applied in Next.js middleware** (`src/middleware.ts`) by matching route patterns.

**Limits:**

| Route | Limit | Window |
|---|---|---|
| `POST /api/signup` | 5 requests | per IP / hour |
| `POST /api/auth/[...nextauth]` | 10 requests | per IP / 15 min |
| `POST /api/forgot-password` | 5 requests | per IP / hour |
| `POST /api/reset-password` | 5 requests | per IP / hour |
| `POST /api/resend-verification` | 3 requests | per IP / hour |
| All other `/api/*` routes | 100 requests | per IP / minute |

**On limit exceeded:** Return `429 Too Many Requests` with `Retry-After` header. Frontend shows a user-friendly error message.

**IP extraction:** Read from `x-forwarded-for` header (set by nginx), fallback to `x-real-ip`.

---

### 5. HTTPS + nginx Reverse Proxy

**New Docker services** added to `docker-compose.yml`:
- `nginx` — reverse proxy on ports 80 and 443, proxies to Next.js container
- `certbot` — Let's Encrypt certificate management with auto-renewal
- Shared `certbot-data` volume for certificates and webroot challenges

**nginx config:**
- HTTP (port 80): permanent 301 redirect to HTTPS
- HTTPS (port 443): proxy_pass to Next.js container (internal port 3000)
- Sets `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto` headers
- Next.js container stops exposing port 3000 externally

**Code change:** `src/lib/auth.ts:92` — change `secure: false` to `secure: process.env.NODE_ENV === "production"` so session cookies are HTTP-only in dev and HTTPS-only in prod.

**Domain:** trippla.de (already configured).

**Prerequisite:** Port 80 and 443 must be forwarded on the router to the RPi.

---

### 6. Security Headers

Added via `next.config.ts` `headers()` config, applied to all routes.

| Header | Value |
|---|---|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` (production only — see note) |
| `Content-Security-Policy` | See below |

**HSTS note:** `includeSubDomains` means all subdomains of trippla.de will be required to use HTTPS for 2 years once a user has visited the site. If any subdomain is ever served over HTTP (test environments, future services), browsers will refuse to connect. For a single-domain self-hosted setup this is acceptable, but avoid adding `preload` unless you intend to submit to the HSTS preload list — that decision is irreversible.

**Content Security Policy:**
The CSP must be derived from an audit of actual external sources used by the app before Phase 1 is considered complete. Known external sources from the codebase:
- Weather API (`src/lib/weather.ts`) — identify the API domain
- Maps link parser (`src/lib/maps-link-parser.ts`) — identify domains
- OG preview resolver (`src/app/api/og-preview/route.ts`) — identify domains
- Push notifications (VAPID) — Web Push endpoints (browser-specific)

The draft CSP will:
- Allow `'self'` for scripts, styles, images, and connect
- Add specific external domains for the sources above
- Avoid `unsafe-inline` for scripts; use nonces for any inline script requirements
- This audit and the resulting CSP policy is a **hard prerequisite** before Phase 1 is marked complete — a missing or broken CSP can silently break push notifications and other features

---

### 7. Health Check Endpoint

`GET /api/health`

**Response (200):**
```json
{ "status": "ok", "db": "ok", "timestamp": "2026-03-25T12:00:00.000Z" }
```

**Response (503) if DB unreachable:**
```json
{ "status": "error", "db": "unreachable", "timestamp": "..." }
```

Runs `prisma.$queryRaw\`SELECT 1\`` to verify DB connectivity. Added to Docker `healthcheck` directive in `docker-compose.yml`.

---

## Phase 2: Broader Public Launch Readiness

### 1. GDPR Data Export (Right to Portability)

`GET /api/user/export`

Returns a downloadable `trippla-data-export.json` file containing all data belonging to the authenticated user:
- Profile: name, email, createdAt, termsAcceptedAt, termsVersion
- Trips (owned and member): name, destination, dates, members
- Itinerary items they created
- Expenses they paid or are split on
- Packing items they claimed
- Poll votes cast
- Comments authored
- Notification preferences
- Push subscription records (endpoint URL and key material) — these are personal data under GDPR and must be included

Generated synchronously and streamed — no background job needed at this user scale.

**UI:** "Download my data" button in Settings, with a brief loading state.

---

### 2. Error Monitoring

**Recommended: self-hosted Glitchtip** (open source, Sentry-compatible Docker container).

Rationale: Sentry (cloud) processes stack traces, user IDs, and potentially request data on US-based servers. Under GDPR this requires a DPA with Sentry and disclosure in the Datenschutzerklärung. While Sentry does provide a GDPR-compliant DPA and SCCs, adding a US-based third-party data processor introduces compliance overhead for a German operator. Glitchtip runs entirely on the RPi — no data leaves the server, no DPA required, free.

**Trade-off:** Glitchtip adds another Docker container (RAM/CPU on the RPi). If RPi resources become constrained, Sentry cloud (with DPA signed and Datenschutz updated) is an acceptable fallback.

**Integration:** `@sentry/nextjs` package is Glitchtip-compatible via the `dsn` config pointing to the local Glitchtip instance.

---

### 3. Database Backups

**Mechanism:** Shell script executed via a cron job in a dedicated Docker container (or the PostgreSQL container itself).

**Script behaviour:**
1. Run `pg_dump` against the PostgreSQL container
2. Compress output with `gzip`
3. Save to a mounted backup volume (external USB drive or NAS — not the RPi SD card)
4. Retain last 7 daily backups; delete older files automatically

**Schedule:** Daily at 03:00 local time.

**Restore procedure:** Documented in `docs/backup-restore.md` alongside the script.

---

### 4. Onboarding Flow

A one-time welcome modal shown after a user's first login.

**Detection:** New `hasOnboarded Boolean @default(false)` field on `User` model. Set to `true` when the user dismisses the modal or creates their first trip.

**Content:**
- Brief introduction to the four main sections: Itinerary, Expenses, Packing, Polls
- Single "Create your first trip" CTA button that closes the modal and opens the new-trip form

**Implementation:** Client-side modal rendered in the dashboard layout, reads `hasOnboarded` from the session. No routing changes required. Dismissed state is persisted via `PATCH /api/user/profile` (existing endpoint).

---

## Schema Migrations Required

| Migration | Field | Model |
|---|---|---|
| Phase 1 | `termsAcceptedAt DateTime?` | `User` |
| Phase 1 | `termsVersion String?` | `User` |
| Phase 2 | `hasOnboarded Boolean @default(false)` | `User` |

---

## What Is Explicitly Out of Scope

- Monetisation, subscription tiers, billing
- Admin panel / user management dashboard
- Marketing / SEO / landing page improvements
- Social sharing
- Real-time collaboration (WebSockets)
- OAuth providers (Google, GitHub login)
