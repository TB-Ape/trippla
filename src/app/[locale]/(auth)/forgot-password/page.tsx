"use client";

import { useState } from "react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
        </div>

        <div className="w-full max-w-md relative z-10 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rounded-sm rotate-45 mx-auto mb-8" />
          <h1 className="text-4xl font-black mb-4 tracking-tighter">{t("auth.checkEmail")}</h1>
          <p className="text-gray-400 mb-8">{t("auth.resetEmailSent")}</p>
          <Link
            href={`/${locale}/login`}
            className="text-teal-400 hover:text-teal-300 font-bold uppercase tracking-wider"
          >
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>

      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rotate-45 group-hover:rotate-90 transition-transform" />
            <span className="text-xl font-bold tracking-tight">{t("common.appName")}</span>
          </Link>

          <h1 className="text-5xl font-black mb-3 tracking-tighter">
            {t("auth.forgotPassword").split(" ")[0]}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
              {t("auth.forgotPassword").split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {t("auth.forgotPasswordSubtitle")}
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500 text-red-400">
              <p className="font-bold text-sm uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t("common.loading") : t("auth.sendResetLink")}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <Link
            href={`/${locale}/login`}
            className="text-teal-400 hover:text-teal-300 font-bold uppercase tracking-wider text-sm"
          >
            ← {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
