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
