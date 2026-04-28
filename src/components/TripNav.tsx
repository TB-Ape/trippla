"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useEffect } from "react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

interface TripNavProps {
  tripId: string;
  currentSection: "overview" | "itinerary" | "accommodations" | "expenses" | "packing" | "polls" | "transport" | "stages";
  unseenSections?: Set<string>;
}

const SECTIONS = [
  { key: "overview", href: "" },
  { key: "itinerary", href: "/itinerary" },
  { key: "accommodations", href: "/accommodations" },
  { key: "expenses", href: "/expenses" },
  { key: "transport", href: "/transport" },
  { key: "packing", href: "/packing" },
  { key: "polls", href: "/polls" },
  { key: "stages", href: "/stages" },
] as const;

export function TripNav({ tripId, currentSection, unseenSections }: TripNavProps) {
  const t = useTranslations("tripDetail");
  const navRef = useRef<HTMLElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);

  const router = useRouter();
  const locale = useLocale();

  useKeyboardShortcuts({
    o: () => router.push(`/${locale}/trips/${tripId}`),
    i: () => router.push(`/${locale}/trips/${tripId}/itinerary`),
    a: () => router.push(`/${locale}/trips/${tripId}/accommodations`),
    x: () => router.push(`/${locale}/trips/${tripId}/expenses`),
    r: () => router.push(`/${locale}/trips/${tripId}/transport`),
    p: () => router.push(`/${locale}/trips/${tripId}/packing`),
    l: () => router.push(`/${locale}/trips/${tripId}/polls`),
    s: () => router.push(`/${locale}/trips/${tripId}/stages`),
  });

  function handleNavKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    const tabs = Array.from(
      navRef.current?.querySelectorAll('[role="tab"]') ?? []
    ) as HTMLElement[];
    const idx = tabs.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) return;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      tabs[(idx + 1) % tabs.length].focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      tabs[(idx - 1 + tabs.length) % tabs.length].focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      tabs[0].focus();
    } else if (e.key === "End") {
      e.preventDefault();
      tabs[tabs.length - 1].focus();
    } else if (e.key === " ") {
      e.preventDefault();
      const href = (document.activeElement as HTMLAnchorElement)?.getAttribute("href");
      if (href) router.push(href);
    }
  }

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    const check = () => {
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      setShowLeftFade(el.scrollLeft > 4);
    };

    check();

    // Scroll active tab into view on mount
    const activeEl = el.querySelector('[data-active="true"]') as HTMLElement | null;
    activeEl?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });

    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return (
    <div className="relative border-b border-white/10 bg-[#0d0d0d]">
      <nav ref={navRef} className="overflow-x-auto scrollbar-hide" role="tablist" aria-label="Trip navigation" onKeyDown={handleNavKeyDown}>
        <div className="flex min-w-max px-4 md:px-8">
          {SECTIONS.map((section) => {
            const isActive = section.key === currentSection;
            return (
              <Link
                key={section.key}
                href={`/trips/${tripId}${section.href}`}
                data-active={isActive}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`inline-flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 focus-visible:outline-offset-[-2px] ${
                  isActive
                    ? "border-teal-400 text-teal-400"
                    : "border-transparent text-gray-400 hover:text-gray-300 hover:border-white/20"
                }`}
              >
                {t(section.key)}
                {unseenSections?.has(section.key) && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      {showLeftFade && (
        <div
          className="absolute left-0 top-0 h-full w-12 pointer-events-none"
          style={{ background: "linear-gradient(to left, transparent, #0d0d0d)" }}
        />
      )}
      {showRightFade && (
        <div
          className="absolute right-0 top-0 h-full w-12 pointer-events-none"
          style={{ background: "linear-gradient(to right, transparent, #0d0d0d)" }}
        />
      )}
    </div>
  );
}
