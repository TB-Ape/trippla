"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { Sidebar } from "@/components/Sidebar";
import type { SidebarItem } from "@/components/Sidebar";
import {
  LayoutDashboard,
  Calendar,
  BedDouble,
  Wallet,
  Plane,
  Package,
  Vote,
  Map,
} from "lucide-react";

type TripSection =
  | "overview"
  | "itinerary"
  | "accommodations"
  | "expenses"
  | "transport"
  | "packing"
  | "polls"
  | "stages";

interface TripNavProps {
  tripId: string;
  currentSection: TripSection;
  unseenSections?: Set<string>;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const SECTION_ICONS: Record<TripSection, React.ReactNode> = {
  overview: <LayoutDashboard size={18} />,
  itinerary: <Calendar size={18} />,
  accommodations: <BedDouble size={18} />,
  expenses: <Wallet size={18} />,
  transport: <Plane size={18} />,
  packing: <Package size={18} />,
  polls: <Vote size={18} />,
  stages: <Map size={18} />,
};

const SECTION_HREFS: Record<TripSection, string> = {
  overview: "",
  itinerary: "/itinerary",
  accommodations: "/accommodations",
  expenses: "/expenses",
  transport: "/transport",
  packing: "/packing",
  polls: "/polls",
  stages: "/stages",
};

export function TripNav({
  tripId,
  currentSection,
  unseenSections,
  mobileOpen,
  onMobileClose,
}: TripNavProps) {
  const t = useTranslations("tripDetail");
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

  const sections: TripSection[] = [
    "overview",
    "itinerary",
    "accommodations",
    "expenses",
    "transport",
    "packing",
    "polls",
    "stages",
  ];

  const items: SidebarItem[] = sections.map((key) => ({
    key,
    href: `/trips/${tripId}${SECTION_HREFS[key]}`,
    icon: SECTION_ICONS[key],
    label: t(key),
    badge: unseenSections?.has(key) && key !== currentSection,
  }));

  return (
    <Sidebar
      items={items}
      current={currentSection}
      ariaLabel="Trip navigation"
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}
