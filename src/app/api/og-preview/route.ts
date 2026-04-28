import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLinkPreview } from "link-preview-js";

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
}

// Simple in-memory cache (survives across requests within the same server instance)
const cache = new Map<string, { data: OgData; ts: number }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Check cache
    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const preview = await getLinkPreview(url, {
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const ogData: OgData = {
      title: "title" in preview ? (preview.title ?? null) : null,
      description: "description" in preview ? (preview.description ?? null) : null,
      image: "images" in preview ? (preview.images?.find((img) => img.startsWith("http")) ?? null) : null,
      favicon: "favicons" in preview ? (preview.favicons?.[0] ?? null) : null,
      siteName: "siteName" in preview ? (preview.siteName ?? null) : null,
    };

    // Cache result
    cache.set(url, { data: ogData, ts: Date.now() });

    // Evict old cache entries periodically
    if (cache.size > 500) {
      const now = Date.now();
      for (const [key, val] of cache) {
        if (now - val.ts > CACHE_TTL) cache.delete(key);
      }
    }

    return NextResponse.json(ogData);
  } catch {
    return NextResponse.json(
      { title: null, description: null, image: null, siteName: null }
    );
  }
}
