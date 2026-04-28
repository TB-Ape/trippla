"use client";

import { useEffect, useState } from "react";

interface OgData {
  title: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  siteName: string | null;
}

// Client-side cache so navigating back doesn't re-fetch
const previewCache = new Map<string, OgData | null>();

export function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<OgData | null>(previewCache.get(url) ?? null);
  const [loaded, setLoaded] = useState(previewCache.has(url));
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (previewCache.has(url)) {
      setData(previewCache.get(url) ?? null);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    fetch("/api/og-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then((res) => res.json())
      .then((og: OgData) => {
        if (cancelled) return;
        const hasContent = og.title || og.description || og.image;
        const result = hasContent ? og : null;
        previewCache.set(url, result);
        setData(result);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        previewCache.set(url, null);
        setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!loaded) {
    return (
      <div className="mt-2 border border-white/10 bg-white/5 animate-pulse h-20 w-full max-w-md rounded" />
    );
  }

  if (!data) return null;

  let domain = "";
  try {
    domain = new URL(url).hostname.replace("www.", "");
  } catch {}

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="mt-2 flex overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition-colors rounded max-w-md cursor-pointer no-underline"
    >
      {data.image && !imgError ? (
        <div className="w-20 h-20 flex-shrink-0 bg-white/10">
          <img
            src={data.image}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        </div>
      ) : data.favicon && !imgError ? (
        <div className="w-20 h-20 flex-shrink-0 bg-white/5 flex items-center justify-center">
          <img
            src={data.favicon}
            alt=""
            className="w-8 h-8 object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : null}
      <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-center gap-0.5">
        {data.title && (
          <p className="text-sm font-semibold text-white truncate">{data.title}</p>
        )}
        {data.description && (
          <p className="text-xs text-gray-400 line-clamp-2">{data.description}</p>
        )}
        <p className="text-xs text-gray-500 truncate">
          {data.siteName || domain}
        </p>
      </div>
    </a>
  );
}
