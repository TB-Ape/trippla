"use client";

import React from "react";
import { LinkPreview } from "./link-preview";

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;

function isUrl(str: string): boolean {
  return /^https?:\/\/[^\s<]+$/.test(str);
}

export function Linkify({ children, className }: { children: string; className?: string }) {
  const parts = children.split(URL_PATTERN);
  const urls: string[] = [];

  const rendered = parts.map((part, i) => {
    if (isUrl(part)) {
      urls.push(part);
      return null;
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });

  // Filter out trailing/leading whitespace-only fragments next to removed URLs
  const textParts = rendered.filter((r) => r !== null);

  if (urls.length === 0) {
    return <span className={className}>{textParts}</span>;
  }

  return (
    <div className={className}>
      <span>{textParts}</span>
      {urls.map((url, i) => (
        <LinkPreview key={`preview-${i}`} url={url} />
      ))}
    </div>
  );
}
