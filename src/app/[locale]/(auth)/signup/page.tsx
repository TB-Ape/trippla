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

export default function SignupPage() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Validate passwords match
    if (password !== confirmPassword) {
      setError(t("auth.passwordsDoNotMatch"));
      setIsLoading(false);
      return;
    }

    if (!termsAccepted) {
      setError(t("auth.mustAgreeToTerms"));
      setIsLoading(false);
      return;
    }

    try {
      // Create account
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, termsAccepted: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Don't auto sign in - redirect to verification message
      router.push(`/${locale}/verify-email?email=${encodeURIComponent(email)}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Something went wrong");
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
          <Link href="/" className="inline-flex items-center gap-2 mb-8 group">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-400 via-cyan-500 to-emerald-500 rotate-45 group-hover:rotate-90 transition-transform" />
            <span className="text-xl font-bold tracking-tight">{t("common.appName")}</span>
          </Link>

          <h1 className="text-5xl font-black mb-3 tracking-tighter">
            {t("auth.createAccount").split(" ")[0]}<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-emerald-500">
              {t("auth.createAccount").split(" ").slice(1).join(" ")}
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            {t("auth.signupSubtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border-2 border-red-500 text-red-400">
              <p className="font-bold text-sm uppercase tracking-wider">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">{t("auth.name")}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t("auth.name")}
              required
              disabled={isLoading}
            />
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder={t("auth.passwordMinLength")}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder={t("auth.confirmPassword")}
              required
              disabled={isLoading}
              minLength={6}
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="termsAccepted"
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              disabled={isLoading}
              className="mt-1 w-4 h-4 accent-teal-400 cursor-pointer flex-shrink-0"
            />
            <label htmlFor="termsAccepted" className="text-sm text-gray-400 cursor-pointer leading-relaxed">
              {t.rich("auth.agreeToTerms", {
                termsLink: (chunks) => (
                  <Link href="/agb" target="_blank" className="text-teal-400 hover:underline font-bold">
                    {chunks}
                  </Link>
                ),
                privacyLink: (chunks) => (
                  <Link href="/datenschutz" target="_blank" className="text-teal-400 hover:underline font-bold">
                    {chunks}
                  </Link>
                ),
              })}
            </label>
          </div>

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? t("auth.creatingAccount") : t("auth.signup")}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-400">
            {t("auth.alreadyHaveAccount")}{" "}
            <Link
              href="/login"
              className="text-teal-400 hover:text-teal-300 font-bold uppercase tracking-wider"
            >
              {t("auth.login")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
