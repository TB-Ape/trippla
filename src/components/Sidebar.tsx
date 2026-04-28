"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";

export type SidebarItem = {
  key: string;
  href: string;
  icon: ReactNode;
  label: string;
  badge?: boolean;
};

interface SidebarProps {
  items: SidebarItem[];
  current: string;
  ariaLabel: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

function NavItems({
  items,
  current,
  showLabels,
  onNavigate,
}: {
  items: SidebarItem[];
  current: string;
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {items.map((item) => {
        const isActive = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            role="menuitem"
            data-active={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={onNavigate}
            className={`relative flex items-center h-12 px-4 gap-3 transition-colors border-l-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-400 focus-visible:outline-offset-[-2px] ${
              isActive
                ? "border-teal-400 text-teal-400 bg-teal-400/5"
                : "border-transparent text-gray-400 hover:text-gray-300 hover:bg-white/5"
            }`}
          >
            <span className="relative flex-shrink-0">
              {item.icon}
              {item.badge && !isActive && (
                <span
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-teal-400"
                  aria-label="New activity"
                />
              )}
            </span>
            {showLabels && (
              <span className="text-xs font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden">
                {item.label}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

export function Sidebar({
  items,
  current,
  ariaLabel,
  mobileOpen = false,
  onMobileClose,
}: SidebarProps) {
  const [desktopOpen, setDesktopOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!desktopOpen) return;
    function handleClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setDesktopOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setDesktopOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [desktopOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onMobileClose?.();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen, onMobileClose]);

  function handleNavKeyDown(e: React.KeyboardEvent) {
    const links = Array.from(
      navRef.current?.querySelectorAll('[role="menuitem"]') ?? []
    ) as HTMLElement[];
    const idx = links.indexOf(document.activeElement as HTMLElement);
    if (idx === -1) return;

    let nextIdx: number | null = null;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      nextIdx = (idx + 1) % links.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nextIdx = (idx - 1 + links.length) % links.length;
    } else if (e.key === "Home") {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === "End") {
      e.preventDefault();
      nextIdx = links.length - 1;
    } else if (e.key === " ") {
      e.preventDefault();
      const href = (document.activeElement as Element)?.getAttribute("href");
      if (href) router.push(href);
    }

    if (nextIdx !== null) {
      links[idx].setAttribute("tabindex", "-1");
      links[nextIdx].setAttribute("tabindex", "0");
      links[nextIdx].focus();
    }
  }

  return (
    <>
      {/* Desktop sidebar — always visible as icon strip, expands to overlay */}
      <nav
        ref={navRef}
        aria-label={ariaLabel}
        aria-hidden={mobileOpen}
        onKeyDown={handleNavKeyDown}
        className={`fixed left-0 top-14 bottom-0 z-30 flex-col bg-[#0d0d0d] border-r border-white/10 transition-[width] duration-200 hidden sm:flex ${
          desktopOpen ? "w-56" : "w-14"
        }`}
      >
        <button
          onClick={() => setDesktopOpen((v) => !v)}
          className="h-12 flex items-center justify-center hover:bg-white/5 transition-colors border-b border-white/10 flex-shrink-0"
          aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={desktopOpen}
        >
          {desktopOpen ? (
            <X size={16} className="text-gray-400" />
          ) : (
            <Menu size={16} className="text-gray-400" />
          )}
        </button>
        <div className="flex-1 py-2 overflow-hidden">
          <NavItems
            items={items}
            current={current}
            showLabels={desktopOpen}
            onNavigate={() => setDesktopOpen(false)}
          />
        </div>
      </nav>

      {/* Desktop overlay backdrop */}
      {desktopOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 hidden sm:block"
          onClick={() => setDesktopOpen(false)}
        />
      )}

      {/* Mobile sidebar — overlay, controlled by parent */}
      {mobileOpen && (
        <>
          <div
            data-testid="mobile-backdrop"
            className="fixed inset-0 z-40 bg-black/40 sm:hidden"
            onClick={onMobileClose}
          />
          <nav
            aria-label={ariaLabel}
            onKeyDown={handleNavKeyDown}
            className="fixed left-0 top-14 bottom-0 z-50 w-56 flex flex-col bg-[#0d0d0d] border-r border-white/10 sm:hidden"
          >
            <div className="flex-1 py-2">
              <NavItems
                items={items}
                current={current}
                showLabels={true}
                onNavigate={onMobileClose}
              />
            </div>
          </nav>
        </>
      )}
    </>
  );
}
