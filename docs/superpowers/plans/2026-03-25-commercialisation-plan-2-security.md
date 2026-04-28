# Commercialisation — Plan 2: Security & Infrastructure

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden Trippla for public exposure: rate limiting on sensitive API routes, HTTPS via nginx reverse proxy, security headers (CSP, HSTS, etc.), and a health check endpoint.

**Architecture:** Rate limiting is implemented as a Node.js utility (`src/lib/rate-limit.ts`) called from individual API route handlers — NOT in middleware, because Next.js middleware runs in Edge Runtime which does not support the Node.js APIs used by `rate-limiter-flexible`. The middleware continues to handle only i18n. nginx is added as a new Docker service that terminates TLS and proxies to the app.

**Tech Stack:** `rate-limiter-flexible`, Next.js App Router, nginx, certbot/Let's Encrypt, Docker Compose, TypeScript

**Reference spec:** `docs/superpowers/specs/2026-03-25-commercialisation-design.md`

**Domain:** trippla.de

**Prerequisite:** Port 80 and 443 must be forwarded on the router to the RPi before deploying nginx.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Install | `rate-limiter-flexible` | In-memory rate limiting |
| Create | `src/lib/rate-limit.ts` | Rate limiting utility (Node.js, called from API routes) |
| Modify | `src/app/api/signup/route.ts` | Apply strict rate limiting |
| Modify | `src/app/api/forgot-password/route.ts` | Apply strict rate limiting |
| Modify | `src/app/api/reset-password/route.ts` | Apply strict rate limiting |
| Modify | `src/app/api/resend-verification/route.ts` | Apply resend rate limiting |
| Modify | `src/app/api/auth/[...nextauth]/route.ts` | Apply auth rate limiting |
| Modify | `src/lib/auth.ts` | Set `secure: process.env.NODE_ENV === "production"` |
| Modify | `next.config.ts` | Add security headers |
| Create | `src/app/api/health/route.ts` | Health check endpoint |
| Create | `nginx/trippla.conf` | nginx site configuration |
| Modify | `docker-compose.yml` | Add nginx + certbot, remove exposed port from app |

---

## Task 1: Fix session cookie secure flag

**Files:**
- Modify: `src/lib/auth.ts:92`

- [ ] **Step 1: Update the cookie config**

In `src/lib/auth.ts`, find the cookies section and change:
```ts
secure: false, // Allow HTTP (local network deployment)
```
to:
```ts
secure: process.env.NODE_ENV === "production",
```

- [ ] **Step 2: Verify dev still works**

```bash
npm run dev
```

Log in. Confirm login still works (cookie sent over HTTP in dev since NODE_ENV is `development`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/auth.ts
git commit -m "fix: set session cookie secure flag based on NODE_ENV"
```

---

## Task 2: Install rate-limiter-flexible

- [ ] **Step 1: Install**

```bash
npm install rate-limiter-flexible
```

- [ ] **Step 2: Verify**

```bash
grep rate-limiter package.json
```

Expected: `"rate-limiter-flexible": "^x.x.x"` in dependencies.

---

## Task 3: Create rate limiting utility

**Files:**
- Create: `src/lib/rate-limit.ts`

Rate limiting is implemented as a utility called from API route handlers. It runs in Node.js runtime (API routes), not Edge Runtime (middleware). The `/api/health` endpoint is explicitly excluded — it is called every 30s by Docker's health check from an internal IP and must not be rate limited.

**Known limitation (documented in spec):** In-memory counters reset on process restart. A burst attack timed around a deployment bypasses limits for that window. Acceptable for Phase 1 scale. Upgrade to the Redis adapter (`rate-limiter-flexible` supports it with no API changes) if this becomes a concern.

- [ ] **Step 1: Create the utility**

Create `src/lib/rate-limit.ts`:

```ts
import { NextResponse } from "next/server";
import { RateLimiterMemory } from "rate-limiter-flexible";

type LimiterKey = "auth" | "strict" | "resend" | "general";

// In-memory limiters — reset on process restart (known limitation, acceptable for Phase 1)
const limiters: Record<LimiterKey, RateLimiterMemory> = {
  auth:    new RateLimiterMemory({ points: 10, duration: 15 * 60 }), // 10 req / 15 min
  strict:  new RateLimiterMemory({ points: 5,  duration: 60 * 60 }), // 5 req / hour
  resend:  new RateLimiterMemory({ points: 3,  duration: 60 * 60 }), // 3 req / hour
  general: new RateLimiterMemory({ points: 100, duration: 60 }),      // 100 req / min
};

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Returns a 429 NextResponse if rate limit exceeded, or null if request is allowed.
 * Usage: const limited = await checkRateLimit(req, "strict"); if (limited) return limited;
 */
export async function checkRateLimit(
  req: Request,
  type: LimiterKey = "general"
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  try {
    await limiters[type].consume(ip);
    return null;
  } catch {
    return new NextResponse("Too Many Requests", {
      status: 429,
      headers: { "Retry-After": "60" },
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/rate-limit.ts
git commit -m "feat: add rate limiting utility for API route handlers"
```

---

## Task 4: Apply rate limiting to sensitive API routes

**Files:**
- Modify: `src/app/api/signup/route.ts`
- Modify: `src/app/api/forgot-password/route.ts`
- Modify: `src/app/api/reset-password/route.ts`
- Modify: `src/app/api/resend-verification/route.ts`
- Modify: `src/app/api/auth/[...nextauth]/route.ts`

For each file, add the rate limit check at the top of the POST handler (before any other logic).

- [ ] **Step 1: Apply to signup**

In `src/app/api/signup/route.ts`, add import and check:
```ts
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "strict");
  if (limited) return limited;
  // ... existing code
}
```

- [ ] **Step 2: Apply to forgot-password**

In `src/app/api/forgot-password/route.ts`:
```ts
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "strict");
  if (limited) return limited;
  // ... existing code
}
```

- [ ] **Step 3: Apply to reset-password**

In `src/app/api/reset-password/route.ts`:
```ts
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "strict");
  if (limited) return limited;
  // ... existing code
}
```

- [ ] **Step 4: Apply to resend-verification**

In `src/app/api/resend-verification/route.ts`:
```ts
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = await checkRateLimit(req, "resend"); // 3 req/hour
  if (limited) return limited;
  // ... existing code
}
```

- [ ] **Step 5: Apply to NextAuth route**

Read `src/app/api/auth/[...nextauth]/route.ts` first. NextAuth exports handler functions. Wrap the POST handler:

```ts
import { checkRateLimit } from "@/lib/rate-limit";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export const GET = handler;

export async function POST(req: Request, context: any) {
  const limited = await checkRateLimit(req, "auth");
  if (limited) return limited;
  return handler(req, context);
}
```

- [ ] **Step 6: Verify rate limiting works**

Test with signup (5 req/hour limit):
```bash
for i in $(seq 1 7); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/signup \
    -H "Content-Type: application/json" \
    -d '{"name":"x","email":"x@x.com","password":"123456","termsAccepted":true}'
done
```

Expected: first ~5 return `400` (validation errors or "already registered"), then `429`.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/signup/route.ts src/app/api/forgot-password/route.ts src/app/api/reset-password/route.ts src/app/api/resend-verification/route.ts src/app/api/auth/[...nextauth]/route.ts
git commit -m "feat: apply rate limiting to sensitive API routes"
```

---

## Task 5: Add security headers

**Files:**
- Modify: `next.config.ts`

**Note on CSP and `unsafe-inline`:** Next.js App Router requires `unsafe-inline` for client-side hydration scripts. Implementing nonce-based CSP for Next.js requires significant middleware changes and is complex. `unsafe-inline` is used here as a documented trade-off for this self-hosted app. If stricter CSP is required in future, Next.js nonce support can be added following the official Next.js CSP documentation.

- [ ] **Step 1: Update next.config.ts**

Replace the content of `next.config.ts`:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withPWAInit from "@ducanh2912/next-pwa";

const withNextIntl = createNextIntlPlugin("./src/i18n.ts");

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS: production only, 2 years + includeSubDomains
  // WARNING: includeSubDomains means ALL subdomains of trippla.de must serve HTTPS.
  // Do NOT add 'preload' without deliberate intent — it is irreversible.
  ...(!isDev
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // unsafe-inline required for Next.js App Router hydration scripts (known trade-off)
      "script-src 'self' 'unsafe-inline'",
      // unsafe-inline required for Tailwind CSS inline styles
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      // External API calls from the browser: weather + geocoding
      "connect-src 'self' https://api.open-meteo.com https://archive-api.open-meteo.com https://us1.locationiq.com",
      "worker-src 'self'",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdfkit"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(withPWA(nextConfig));
```

- [ ] **Step 2: Verify headers in dev**

```bash
npm run dev
curl -I http://localhost:3000 | grep -E "x-frame|x-content|content-security|referrer"
```

Expected: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: ...` present.

- [ ] **Step 3: Test all key features still work**

Open browser DevTools → Console. Confirm no CSP violations appear while using:
- Login/logout
- Weather widget on a trip
- Location search (geocoding)
- Push notification permission prompt

If a CSP violation appears, add the offending domain to the appropriate directive in `next.config.ts`.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts
git commit -m "feat: add security headers and CSP to Next.js config"
```

---

## Task 6: Health check endpoint

**Files:**
- Create: `src/app/api/health/route.ts`

This endpoint is excluded from rate limiting (see `src/lib/rate-limit.ts` — health check calls originate from the Docker internal network, not from external IPs, so they won't hit the limiter in practice. The endpoint has no auth so it is safe to leave open).

- [ ] **Step 1: Create the route**

Create `src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: "error", db: "unreachable", timestamp: new Date().toISOString() },
      { status: 503 }
    );
  }
}
```

- [ ] **Step 2: Verify**

```bash
npm run dev
curl http://localhost:3000/api/health
```

Expected: `{"status":"ok","db":"ok","timestamp":"..."}` with status 200.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/health/route.ts
git commit -m "feat: add /api/health endpoint for uptime monitoring"
```

---

## Task 7: nginx + HTTPS + Docker Compose update

**Files:**
- Create: `nginx/trippla.conf`
- Modify: `docker-compose.yml`

### 7a: nginx config

- [ ] **Step 1: Create nginx config**

```bash
mkdir -p /home/tobias/trippla/nginx
```

Create `nginx/trippla.conf`:

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name trippla.de www.trippla.de;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS reverse proxy
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name trippla.de www.trippla.de;

    ssl_certificate /etc/letsencrypt/live/trippla.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/trippla.de/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    location / {
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
    }
}
```

### 7b: Update Docker Compose

- [ ] **Step 2: Update docker-compose.yml**

Replace the content of `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_USER: trippla
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: trippla
    volumes:
      - ${HDD_PATH}/trippla/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U trippla"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build:
      context: .
      args:
        NEXT_PUBLIC_LOCATIONIQ_API_KEY: ${NEXT_PUBLIC_LOCATIONIQ_API_KEY}
        NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
    restart: unless-stopped
    expose:
      - "3000"
    volumes:
      - ${HDD_PATH}/trippla/uploads:/app/data/uploads
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://trippla:${POSTGRES_PASSWORD}@db:5432/trippla
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      APP_URL: ${APP_URL}
      NEXT_PUBLIC_LOCATIONIQ_API_KEY: ${NEXT_PUBLIC_LOCATIONIQ_API_KEY}
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: ${NEXT_PUBLIC_VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_CONTACT_EMAIL: ${VAPID_CONTACT_EMAIL}
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/trippla.conf:/etc/nginx/conf.d/default.conf:ro
      - certbot-www:/var/www/certbot:ro
      - certbot-conf:/etc/letsencrypt:ro
    depends_on:
      - app

  certbot:
    image: certbot/certbot
    volumes:
      - certbot-www:/var/www/certbot
      - certbot-conf:/etc/letsencrypt
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  certbot-www:
  certbot-conf:
```

### 7c: Issue the initial certificate (bootstrap)

The HTTPS server block references cert files that don't exist yet. Bootstrap sequence:

- [ ] **Step 3: Start nginx on HTTP only first**

Temporarily comment out the entire HTTPS `server { ... }` block (the second server block) in `nginx/trippla.conf`, then:

```bash
docker compose up -d nginx certbot
```

- [ ] **Step 4: Issue certificate via certbot**

```bash
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d trippla.de \
  -d www.trippla.de \
  --email tobias_busch@ymail.com \
  --agree-tos \
  --non-interactive
```

Expected: `Successfully received certificate` message.

- [ ] **Step 5: Bring up full stack with HTTPS**

Uncomment the HTTPS block in `nginx/trippla.conf`, then bring up everything:

```bash
docker compose up -d
```

- [ ] **Step 6: Verify HTTPS**

```bash
curl -I https://trippla.de/api/health
```

Expected: `HTTP/2 200` and `{"status":"ok","db":"ok",...}`.

```bash
curl -I http://trippla.de
```

Expected: `301` redirect to `https://trippla.de`.

- [ ] **Step 7: Commit**

```bash
git add nginx/trippla.conf docker-compose.yml
git commit -m "feat: add nginx HTTPS reverse proxy with Let's Encrypt certbot"
```

---

## Done

All Phase 1 security and infrastructure items are complete:
- Session cookie is `secure: true` in production
- Rate limiting on all sensitive API routes (strict on auth/signup/password)
- Security headers: CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Health check endpoint at `/api/health` wired to Docker healthcheck
- nginx with Let's Encrypt TLS in Docker
- App no longer exposes a public port

**Next:** Execute Plan 3 (Phase 2 Operations) from `docs/superpowers/plans/2026-03-25-commercialisation-plan-3-phase2.md`
