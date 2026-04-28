"use client";

import { useRef, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Settings as SettingsIcon, Menu } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { UserAvatar } from "@/components/UserAvatar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsHelp } from "@/components/KeyboardShortcutsHelp";

interface AppHeaderProps {
  backHref?: string;
  backLabel?: string;
  onMobileMenuToggle?: () => void;
}

export function AppHeader({ backHref, backLabel, onMobileMenuToggle }: AppHeaderProps) {
  const t = useTranslations();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const params = useParams();
  const tripId = typeof params?.tripId === "string" ? params.tripId : null;
  const [showHelp, setShowHelp] = useState(false);

  useKeyboardShortcuts({
    t: () => router.push(`/${locale}/trips`),
    m: () => router.push(`/${locale}/templates`),
    b: () => router.push(`/${locale}/bucketlist`),
    "?": () => setShowHelp((v) => !v),
    Escape: () => setShowHelp(false),
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <header className="border-b border-white/10 bg-[#0d0d0d] px-4 md:px-8 h-14">
      <div className="flex justify-between items-center h-full">
        {/* Logo */}
        <div className="flex items-center">
          {onMobileMenuToggle && (
            <button
              onClick={onMobileMenuToggle}
              className="sm:hidden p-1 -ml-1 mr-2 hover:bg-white/5 transition-colors"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-gray-400" />
            </button>
          )}
          <Link href="/trips" className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45" />
            <span className="text-xl md:text-2xl font-bold tracking-tight">{t("common.appName")}</span>
          </Link>
        </div>

        {/* Right side */}
        {backHref ? (
          /* Back-link mode */
          <Link
            href={backHref}
            className="px-3 md:px-6 py-2 border border-white/20 hover:bg-white/5 transition-colors uppercase text-xs md:text-sm tracking-wider"
          >
            {backLabel ?? `← ${t("tripDetail.backToTrip")}`}
          </Link>
        ) : (
          /* Full mode */
          <div className="flex items-center gap-2 md:gap-4">
            {/* User chip + dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-2 px-2 py-1.5 border transition-colors cursor-pointer ${
                  open
                    ? "border-teal-400/[0.4] bg-teal-500/[0.08]"
                    : "border-white/10 bg-white/[0.04] hover:border-white/20"
                }`}
              >
                <UserAvatar
                  name={session?.user?.name ?? null}
                  email={session?.user?.email ?? ""}
                  image={session?.user?.image ?? null}
                  size="sm"
                />
                <span className="hidden sm:inline text-sm text-gray-300 font-medium">
                  {session?.user?.name}
                </span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 10 10"
                  fill="none"
                  className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
                >
                  <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a1a] border border-white/[0.12] shadow-2xl z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-bold text-white truncate">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{session?.user?.email}</p>
                  </div>
                  {/* Settings */}
                  <Link
                    href="/settings"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-white/5 transition-colors text-gray-300 w-full"
                  >
                    <SettingsIcon size={14} />
                    {t("settings.title")}
                  </Link>
                  {/* Sign Out */}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="px-4 py-2.5 text-sm flex items-center gap-2.5 hover:bg-white/5 transition-colors text-red-400 hover:text-red-300 border-t border-white/[0.06] mt-1 w-full"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                    </svg>
                    {t("common.signOut")}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <KeyboardShortcutsHelp
        open={showHelp}
        onClose={() => setShowHelp(false)}
        tripId={tripId}
      />
    </header>
  );
}
