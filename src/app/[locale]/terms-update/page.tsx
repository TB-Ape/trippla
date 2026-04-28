"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { Button } from "@/components/ui/button";

export default function TermsUpdatePage() {
  const t = useTranslations("termsUpdate");
  const tLegal = useTranslations("legal");
  const router = useRouter();
  const locale = useLocale();
  const { update } = useSession();
  const [isAccepting, setIsAccepting] = useState(false);

  async function handleAccept() {
    setIsAccepting(true);
    await fetch("/api/user/accept-terms", { method: "POST" });
    // Refresh the session JWT so needsTermsUpdate becomes false in the token.
    // Without this, TermsGuard reads the stale token and redirects back here.
    await update();
    router.push(`/${locale}/trips`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full border-2 border-white/10 p-8">
        <h1 className="text-3xl font-black tracking-tighter mb-4">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
            {t("title")}
          </span>
        </h1>
        <p className="text-gray-400 mb-6">{t("subtitle")}</p>
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/agb" target="_blank" className="text-teal-400 hover:underline">
            {tLegal("agb")}
          </Link>
          {" · "}
          <Link href="/datenschutz" target="_blank" className="text-teal-400 hover:underline">
            {tLegal("datenschutz")}
          </Link>
        </div>
        <Button variant="gradient" onClick={handleAccept} disabled={isAccepting} className="w-full">
          {isAccepting ? t("accepting") : t("accept")}
        </Button>
      </div>
    </div>
  );
}
