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

// Extract Glitchtip origin from DSN for CSP (e.g. "http://key@localhost:8000/1" → "http://localhost:8000")
const glitchtipDsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;
const glitchtipOrigin = glitchtipDsn
  ? (() => {
      try {
        const url = new URL(glitchtipDsn);
        return `${url.protocol}//${url.host}`;
      } catch {
        return "";
      }
    })()
  : "";

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
      `connect-src 'self' https://api.open-meteo.com https://archive-api.open-meteo.com https://us1.locationiq.com${glitchtipOrigin ? ` ${glitchtipOrigin}` : ""}`,
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
