"use client";

import { useTranslations } from "next-intl";
import { Plane, LayoutTemplate, Star } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import type { SidebarItem } from "@/components/Sidebar";

type AppSection = "trips" | "templates" | "bucketlist";

interface AppNavProps {
  current: AppSection;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function AppNav({ current, mobileOpen, onMobileClose }: AppNavProps) {
  const t = useTranslations();

  const items: SidebarItem[] = [
    { key: "trips", href: "/trips", icon: <Plane size={18} />, label: t("trips.yourTrips") },
    { key: "templates", href: "/templates", icon: <LayoutTemplate size={18} />, label: t("templates.browse") },
    { key: "bucketlist", href: "/bucketlist", icon: <Star size={18} />, label: t("bucketList.title") },
  ];

  return (
    <Sidebar
      items={items}
      current={current}
      ariaLabel="Main navigation"
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  );
}
