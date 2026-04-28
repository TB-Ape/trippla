"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";

const SECTION_ORDER = [
  "overview",
  "itinerary",
  "accommodations",
  "expenses",
  "transport",
  "packing",
  "polls",
  "stages",
] as const;

const SECTION_HREFS: Record<(typeof SECTION_ORDER)[number], string> = {
  overview: "",
  itinerary: "/itinerary",
  accommodations: "/accommodations",
  expenses: "/expenses",
  packing: "/packing",
  polls: "/polls",
  transport: "/transport",
  stages: "/stages",
};

type Section = (typeof SECTION_ORDER)[number];

const SESSION_KEY = "tripNavLastSection";

interface PageTransitionProps {
  section: Section;
  tripId?: string;
  children: React.ReactNode;
  className?: string;
}

export function PageTransition({ section, tripId, children, className }: PageTransitionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const prev = sessionStorage.getItem(SESSION_KEY) as Section | null;
    sessionStorage.setItem(SESSION_KEY, section);

    const el = ref.current;
    if (!el) return;

    const prevIdx = prev ? SECTION_ORDER.indexOf(prev) : -1;
    const currIdx = SECTION_ORDER.indexOf(section);

    // If no previous section (direct load) just show without animating
    if (prevIdx === -1) return;

    const forward = currIdx > prevIdx;
    const startX = forward ? "100%" : "-100%";

    el.animate(
      [
        { transform: `translateX(${startX})`, opacity: 0.6 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      {
        duration: 280,
        easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        fill: "forwards",
      }
    );
  }, [section]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!tripId || touchStartX.current === null || touchStartY.current === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    // Require clear horizontal intent and minimum distance
    if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY) * 1.5) return;

    const currIdx = SECTION_ORDER.indexOf(section);
    const nextIdx = deltaX < 0 ? currIdx + 1 : currIdx - 1;

    if (nextIdx < 0 || nextIdx >= SECTION_ORDER.length) return;

    const nextSection = SECTION_ORDER[nextIdx];
    router.push(`/${locale}/trips/${tripId}${SECTION_HREFS[nextSection]}`);
  }

  return (
    <div style={{ overflowX: "hidden" }} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div ref={ref} className={className}>
        {children}
      </div>
    </div>
  );
}
