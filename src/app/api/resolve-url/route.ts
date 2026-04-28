import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

    // Only allow resolving Google short links
    const parsed = new URL(url);
    if (
      !parsed.hostname.includes("goo.gl") &&
      !parsed.hostname.includes("google.com") &&
      !parsed.hostname.includes("google.de")
    ) {
      return NextResponse.json({ error: "Only Google URLs allowed" }, { status: 400 });
    }

    // Follow redirect without downloading body
    const response = await fetch(url, { method: "HEAD", redirect: "follow" });
    const resolvedUrl = response.url;

    return NextResponse.json({ url: resolvedUrl });
  } catch {
    return NextResponse.json({ error: "Failed to resolve URL" }, { status: 500 });
  }
}
