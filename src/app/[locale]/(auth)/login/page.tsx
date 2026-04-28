"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { LocaleLink as Link } from "@/components/LocaleLink";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function LoginPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userEmail, setUserEmail] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    setUserEmail(email);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      // Check if there's a pending join link
      const pendingJoinCode = sessionStorage.getItem("pendingJoinCode");
      if (pendingJoinCode) {
        sessionStorage.removeItem("pendingJoinCode");
        router.push(`/${locale}/join/${pendingJoinCode}`);
      } else {
        router.push(`/${locale}/trips`);
      }
      router.refresh();
    } catch (error) {
      setError("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 md:w-96 md:h-96 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 md:w-96 md:h-96 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
      </div>

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/${locale}`} className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rotate-45 group-hover:rotate-90 transition-transform" />
            <span className="text-xl font-bold tracking-tight">{t("common.appName")}</span>
          </Link>

          <h1 className="text-5xl font-black mb-3 tracking-tighter">
            {t("auth.welcomeBack").split(" ")[0]}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
              {t("auth.welcomeBack").split(" ")[1]}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500 text-red-400">
              <p className="font-bold text-sm uppercase tracking-wider mb-2">{error}</p>
              {error.includes("verify your email") && userEmail && (
                <Link
                  href={`/${locale}/verify-email?email=${encodeURIComponent(userEmail)}`}
                  className="text-teal-400 hover:text-teal-300 text-sm underline"
                >
                  {t("auth.resendVerification")}
                </Link>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">{t("auth.email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.password")}
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
            {isLoading ? t("auth.loggingIn") : t("auth.login")}
          </Button>

          <div className="text-right">
            <Link
              href={`/${locale}/forgot-password`}
              className="text-sm text-gray-400 hover:text-teal-400 transition-colors"
            >
              {t("auth.forgotPassword").charAt(0) + t("auth.forgotPassword").slice(1).toLowerCase()}?
            </Link>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            {t("auth.dontHaveAccount")}{" "}
            <Link
              href={`/${locale}/signup`}
              className="text-teal-400 hover:text-teal-300 font-bold uppercase tracking-wider"
            >
              {t("auth.signup")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
