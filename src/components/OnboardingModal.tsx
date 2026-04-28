"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Map, DollarSign, Package, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onDismiss: () => void;
}

const features = [
  { key: "itinerary", Icon: Map },
  { key: "expenses", Icon: DollarSign },
  { key: "packing", Icon: Package },
  { key: "polls", Icon: Vote },
] as const;

export function OnboardingModal({ onDismiss }: Props) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const locale = useLocale();
  const [isDismissing, setIsDismissing] = useState(false);

  async function markOnboarded() {
    if (isDismissing) return;
    setIsDismissing(true);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hasOnboarded: true }),
    });
    onDismiss();
  }

  async function handleCreateTrip() {
    await markOnboarded();
    router.push(`/${locale}/trips/new`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-[#111] border-2 border-white/10 max-w-lg w-full p-8">
        <h1 className="text-3xl font-black tracking-tighter mb-1">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("welcomeTitle")}
          </span>
        </h1>
        <p className="text-gray-400 mb-8 text-sm uppercase tracking-widest font-bold">
          {t("welcomeSubtitle")}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {features.map(({ key, Icon }) => (
            <div key={key} className="border border-white/10 p-4">
              <Icon className="w-5 h-5 text-teal-400 mb-2" />
              <h3 className="font-bold text-sm uppercase tracking-wider mb-1">
                {t(key as any)}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {t(`${key}Desc` as any)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button
            variant="gradient"
            onClick={handleCreateTrip}
            disabled={isDismissing}
            className="flex-1"
          >
            {t("createFirstTrip")}
          </Button>
          <Button variant="outline" onClick={markOnboarded} disabled={isDismissing}>
            {t("skip")}
          </Button>
        </div>
      </div>
    </div>
  );
}
