"use client";

import { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Plane, LayoutTemplate, Star } from "lucide-react";
import type { ReactNode } from "react";

type AppSection = "trips" | "templates" | "bucketlist";

interface AppNavProps {
  current: AppSection;
}

const TABS: { key: AppSection; href: string; icon: ReactNode }[] = [
  { key: "trips", href: "/trips", icon: <Plane size={14} /> },
  { key: "templates", href: "/templates", icon: <LayoutTemplate size={14} /> },
  { key: "bucketlist", href: "/bucketlist", icon: <Star size={14} /> },
];

export function AppNav({ current }: AppNavProps) {
  const t = useTranslations();
  const navRef = useRef<HTMLElement>(null);
  const [showRightFade, setShowRightFade] = useState(false);
  const [showLeftFade, setShowLeftFade] = useState(false);

  const router = useRouter();

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
    const activeEl = el.querySelector('[data-active="true"]') as HTMLElement | null;
    activeEl?.scrollIntoView({ behavior: "instant", inline: "center", block: "nearest" });
    el.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      el.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  const labels: Record<AppSection, string> = {
    trips: t("trips.yourTrips"),
    templates: t("templates.browse"),
    bucketlist: t("bucketList.title"),
  };

  return (
    <div className="relative border-b border-white/10 bg-[#0d0d0d]">
      <nav ref={navRef} className="overflow-x-auto scrollbar-hide" role="tablist" aria-label="Main navigation" onKeyDown={handleNavKeyDown}>
        <div className="flex min-w-max px-4 md:px-8">
          {TABS.map((tab) => {
            const isActive = tab.key === current;
            return (
              <Link
                key={tab.key}
                href={tab.href}
                data-active={isActive}
                role="tab"
                aria-selected={isActive}
                tabIndex={isActive ? 0 : -1}
                className={`group px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 focus-visible:outline-offset-[-2px] ${
                  isActive
                    ? "border-teal-400 text-teal-400"
                    : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/20"
                }`}
              >
                <span className={isActive ? "text-teal-400" : "text-gray-500 group-hover:text-gray-300 transition-colors"}>
                  {tab.icon}
                </span>
                {labels[tab.key]}
              </Link>
            );
          })}
        </div>
      </nav>
      {showLeftFade && (
        <div className="absolute left-0 top-0 h-full w-12 pointer-events-none" style={{ background: "linear-gradient(to left, transparent, #0d0d0d)" }} />
      )}
      {showRightFade && (
        <div className="absolute right-0 top-0 h-full w-12 pointer-events-none" style={{ background: "linear-gradient(to right, transparent, #0d0d0d)" }} />
      )}
    </div>
  );
}
